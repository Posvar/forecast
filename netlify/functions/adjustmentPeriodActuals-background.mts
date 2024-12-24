import { BlobServiceClient } from "@azure/storage-blob";
import { promisify } from "util";
import fetch from "node-fetch";
import { ethers } from "ethers";

const AZURE_STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const AZURE_STORAGE_SAS_TOKEN = process.env.AZURE_STORAGE_SAS_TOKEN;
const CONTAINER_NAME = "ittybits-assets"; // Replace with your container name
const BLOB_NAME = "adjustment_periods.json.gz"; // Replace with the correct blob name
const blobServiceClientUrl = `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net?${AZURE_STORAGE_SAS_TOKEN}`;
const gzipAsync = promisify(require("zlib").gzip);

async function fetchCurrentBlockHeight() {
    const provider = new ethers.JsonRpcProvider("https://mainnet.facet.org/");
    return await provider.getBlockNumber();
}

async function fetchContractValues(blockNumber) {
    const provider = new ethers.JsonRpcProvider("https://mainnet.facet.org/");
    const contractAddress = "0x4200000000000000000000000000000000000015";
    const contractABI = [
        "function fctMintPeriodL1DataGas() view returns (uint128)",
        "function fctMintRate() view returns (uint128)"
    ];
    const contract = new ethers.Contract(contractAddress, contractABI, provider);
    const fctMintPeriodL1DataGas = await contract.fctMintPeriodL1DataGas({ blockTag: blockNumber });
    const fctMintRate = await contract.fctMintRate({ blockTag: blockNumber });
    return { fctMintPeriodL1DataGas: fctMintPeriodL1DataGas.toString(), fctMintRate: fctMintRate.toString() };
}

async function loadExistingData() {
    const blobServiceClient = new BlobServiceClient(blobServiceClientUrl);
    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
    const blockBlobClient = containerClient.getBlockBlobClient(BLOB_NAME);

    try {
        const downloadBlockBlobResponse = await blockBlobClient.download(0);
        const chunks = [];
        for await (const chunk of downloadBlockBlobResponse.readableStreamBody) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        return JSON.parse(buffer.toString("utf-8"));
    } catch (error) {
        console.warn("Existing blob not found or unreadable. Starting fresh.");
        return [];
    }
}

async function saveDataToAzure(data) {
    const blobServiceClient = new BlobServiceClient(blobServiceClientUrl);
    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
    const blockBlobClient = containerClient.getBlockBlobClient(BLOB_NAME);

    const compressedData = await gzipAsync(Buffer.from(JSON.stringify(data)));
    await blockBlobClient.uploadData(compressedData, {
        blobHTTPHeaders: { blobContentType: "application/json", blobContentEncoding: "gzip" }
    });

    console.log("Data saved to Azure.");
}

async function calculateAdjustmentData(blockNumber) {
    const { fctMintPeriodL1DataGas, fctMintRate } = await fetchContractValues(blockNumber);

    const fctMinted = fctMintPeriodL1DataGas * fctMintRate;
    const fctMintedGwei = fctMinted / 1e18;
    const adjustmentFactor = Math.max(0.5, Math.min(2, 400000 / fctMintedGwei));
    const newMintRate = fctMintRate * adjustmentFactor;
    const newMintRateGwei = newMintRate / 1e9;

    return {
        "block-ending": blockNumber,
        fctMintPeriodL1DataGas: parseFloat(fctMintPeriodL1DataGas),
        fctMintRate: parseFloat(fctMintRate),
        fctMinted: parseFloat(fctMinted.toFixed(0)), // Force full decimal notation
        fctMintedGwei: parseFloat(fctMintedGwei.toFixed(10)), // Optional: adjust precision if needed
        adjustmentFactor: parseFloat(adjustmentFactor.toFixed(10)),
        newMintRate: parseFloat(newMintRate.toFixed(10)),
        newMintRateGwei: parseFloat(newMintRateGwei.toFixed(10))
    };
}

export const handler = async () => {
    try {
        // Fetch current block height
        const currentBlockHeight = await fetchCurrentBlockHeight();
        console.log("Current block height:", currentBlockHeight);

        // Load existing JSON data
        const existingData = await loadExistingData();
        const lastProcessedBlock = existingData.length > 0 ? existingData[existingData.length - 1]["block-ending"] : 0;

        // Check if we need to process the next 10K block interval
        const nextBlockEnding = Math.ceil((lastProcessedBlock + 1) / 10000) * 10000 - 1;
        if (currentBlockHeight < nextBlockEnding) {
            console.log(`Next 10K block interval (${nextBlockEnding}) not yet reached.`);
            return { statusCode: 200, body: JSON.stringify({ message: "No new blocks to process." }) };
        }

        // Fetch and process data for the next 10K block
        const adjustmentData = await calculateAdjustmentData(nextBlockEnding);
        existingData.push(adjustmentData);
        await saveDataToAzure(existingData);

        console.log(`Processed and saved data for block ${nextBlockEnding}.`);
        return { statusCode: 200, body: JSON.stringify({ message: "Success" }) };
    } catch (error) {
        console.error("Error in handler:", error);
        return { statusCode: 500, body: JSON.stringify({ message: "Failed" }) };
    }
};