import React, { useState } from 'react'

interface CollapsibleSectionProps {
  title: string
  children: React.ReactNode
  defaultExpanded?: boolean
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, children, defaultExpanded = true }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <section className="rounded-lg bg-white p-6 shadow-sm">
      <h2 
        className="mb-6 text-xl font-bold cursor-pointer flex items-center"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="mr-2">{isExpanded ? '▼' : '▶'}</span>
        {title}
      </h2>
      {isExpanded && (
        <div className="space-y-6">
          {children}
        </div>
      )}
    </section>
  )
}