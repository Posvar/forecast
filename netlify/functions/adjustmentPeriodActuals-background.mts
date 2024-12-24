import { BlobServiceClient } from "@azure/storage-blob";
import { Readable } from "stream";
import * as zlib from "zlib";
import { ethers } from "ethers";

const AZURE_STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const AZURE_STORAGE_SAS_TOKEN = process.env.AZURE_STORAGE_SAS_TOKEN;
const CONTAINER_NAME = "ittybits-assets";
const BLOB_NAME = "adjustment_periods.json.gz";

const blobServiceClientUrl = `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net?${AZURE_STORAGE_SAS_TOKEN}`;

// Utility function to convert streams to buffers
const streamToBuffer = async (readableStream) => {
    return new Promise((resolve, reject) => {
        const chunks = [];
        readableStream.on("data", (data) => {
            chunks.push(data instanceof Buffer ? data : Buffer.from(data));
        });
        readableStream.on("end", () => {
            resolve(Buffer.concat(chunks));
        });
        readableStream.on("error", reject);
    });
};

// Fetch the current block height
async function fetchCurrentBlockHeight() {
    const provider = new ethers.JsonRpcProvider("https://mainnet.facet.org/");
    return await provider.getBlockNumber();
}

// Fetch contract values for a specific block
async function fetchContractValues(blockNumber) {
    const provider = new ethers.JsonRpcProvider("https://mainnet.facet.org/");
    const contractAddress = "0x4200000000000000000000000000000000000015";
    const contractABI = [
        "function fctMintPeriodL1DataGas() view returns (uint128)",
        "function fctMintRate() view returns (uint128)",
    ];
    const contract = new ethers.Contract(contractAddress, contractABI, provider);
    const fctMintPeriodL1DataGas = await contract.fctMintPeriodL1DataGas({ blockTag: blockNumber });
    const fctMintRate = await contract.fctMintRate({ blockTag: blockNumber });
    return {
        fctMintPeriodL1DataGas: fctMintPeriodL1DataGas.toString(),
        fctMintRate: fctMintRate.toString(),
    };
}

// Load existing data from Azure Blob Storage
async function loadExistingData() {
    const blobServiceClient = new BlobServiceClient(blobServiceClientUrl);
    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
    const blockBlobClient = containerClient.getBlockBlobClient(BLOB_NAME);

    try {
        const downloadBlockBlobResponse = await blockBlobClient.download(0);
        const buffer = await streamToBuffer(downloadBlockBlobResponse.readableStreamBody);
        const decompressed = zlib.gunzipSync(buffer);
        console.log("Existing blob loaded successfully.");
        return JSON.parse(decompressed.toString("utf-8"));
    } catch (error) {
        console.warn("Existing blob not found or unreadable. Starting fresh.", error);
        return [];
    }
}

// Save updated data to Azure Blob Storage
async function saveDataToAzure(data) {
    const blobServiceClient = new BlobServiceClient(blobServiceClientUrl);
    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
    const blockBlobClient = containerClient.getBlockBlobClient(BLOB_NAME);

    try {
        const compressedData = zlib.gzipSync(Buffer.from(JSON.stringify(data)));
        await blockBlobClient.uploadData(compressedData, {
            blobHTTPHeaders: { blobContentType: "application/json", blobContentEncoding: "gzip" },
        });
        console.log("Data saved to Azure.");
    } catch (error) {
        console.error("Error saving data to Azure:", error);
        throw error;
    }
}

// Calculate adjustment data for a specific block
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
        fctMinted: parseFloat(fctMinted.toFixed(0)),
        fctMintedGwei: parseFloat(fctMintedGwei.toFixed(10)),
        adjustmentFactor: parseFloat(adjustmentFactor.toFixed(10)),
        newMintRate: parseFloat(newMintRate.toFixed(10)),
        newMintRateGwei: parseFloat(newMintRateGwei.toFixed(10)),
    };
}

// Main handler function
export const handler = async () => {
    try {
        // Fetch current block height
        const currentBlockHeight = await fetchCurrentBlockHeight();
        console.log("Current block height:", currentBlockHeight);

        // Load existing JSON data
        const existingData = await loadExistingData();
        const lastProcessedBlock = existingData.length > 0 ? existingData[existingData.length - 1]["block-ending"] : 0;

        // Start iterating from the next block-ending after the last processed one
        let nextBlockEnding = Math.ceil((lastProcessedBlock + 1) / 10000) * 10000 - 1;

        // Process all overdue 10K blocks
        while (nextBlockEnding <= currentBlockHeight) {
            // Check if the block-ending already exists in the JSON file
            if (existingData.some(entry => entry["block-ending"] === nextBlockEnding)) {
                console.log(`Block ${nextBlockEnding} already exists in the data. Skipping.`);
            } else {
                console.log(`Processing block ${nextBlockEnding}...`);
                // Fetch and process data for the current 10K block
                const adjustmentData = await calculateAdjustmentData(nextBlockEnding);
                existingData.push(adjustmentData);
                await saveDataToAzure(existingData);
                console.log(`Processed and saved data for block ${nextBlockEnding}.`);
            }

            // Move to the next 10K block
            nextBlockEnding += 10000;
        }

        console.log("All overdue blocks processed.");
        return { statusCode: 200, body: JSON.stringify({ message: "Success" }) };
    } catch (error) {
        console.error("Error in handler:", error);
        return { statusCode: 500, body: JSON.stringify({ message: "Failed" }) };
    }
};