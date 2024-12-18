import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { InfoIcon, ExternalLink } from 'lucide-react'

export function AboutTooltip() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <TooltipProvider>
      <Tooltip open={isOpen} onOpenChange={setIsOpen}>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="About This Dashboard"
          >
            <InfoIcon className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent 
          className="w-80 p-4" 
          sideOffset={5}
          onPointerDownOutside={() => setIsOpen(false)}
        >
          <h3 className="font-semibold mb-2">About This Dashboard</h3>
          <p className="text-sm mb-4">
            This dashboard provides an in-depth view of the variables driving token issuance for Facet Protocol's native gas token, Facet Compute Token (FCT). 
            Powered by Facet's innovative gas model, FCT issuance is dynamically regulated based on both Ethereum and Facet network activity, ensuring a secure 
            and fair allocation process with deflationary properties. Learn more in Docs below:
          </p>
          <Button 
            className="w-full bg-primary hover:bg-primary/90 text-white"
            onClick={() => window.open("https://docs.facet.org/3.-technical-details/facets-gas-mechanism", "_blank", "noopener,noreferrer")}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Facet Docs
          </Button>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

