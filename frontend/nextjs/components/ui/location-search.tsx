"use client"

import { useState, useRef } from "react"
import { Input } from "@/components/ui/input"
import { MapPin, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LocationSearchProps {
  value: string
  onChange: (value: string) => void
  onAddressChange?: (address: string) => void
  placeholder?: string
  className?: string
}

interface Suggestion {
  place_id: string
  description: string
  structured_formatting: {
    main_text: string
    secondary_text: string
  }
}

export function LocationSearch({ 
  value, 
  onChange, 
  onAddressChange,
  placeholder = "Add Event Location",
  className 
}: LocationSearchProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Mock suggestions for demo - includes San Diego area locations
  const getMockSuggestions = (query: string): Suggestion[] => {
    if (!query.trim()) return []
    
    const locations = [
      { name: "Patrick Henry High School", address: "6702 Wandermere Rd, San Diego, CA 92120" },
      { name: "Balboa Park", address: "1549 El Prado, San Diego, CA 92101" },
      { name: "Mission Beach", address: "Mission Beach, San Diego, CA 92109" },
      { name: "Gaslamp Quarter", address: "Gaslamp Quarter, San Diego, CA 92101" },
      { name: "La Jolla Cove", address: "1100 Coast Blvd, La Jolla, CA 92037" },
      { name: "Sunset Cliffs", address: "Cornish Dr, San Diego, CA 92107" },
      { name: "San Diego Zoo", address: "2920 Zoo Dr, San Diego, CA 92101" },
      { name: "Seaport Village", address: "849 W Harbor Dr, San Diego, CA 92101" },
      { name: "Ocean Beach Pier", address: "1950 Abbott St, San Diego, CA 92107" },
      { name: "Coronado Beach", address: "1500 Orange Ave, Coronado, CA 92118" },
      { name: "PHHS Gymnasium", address: "Patrick Henry High School Gym, San Diego, CA" },
      { name: "PHHS Library", address: "Patrick Henry High School Library, San Diego, CA" },
      { name: "PHHS Football Field", address: "Patrick Henry High School Field, San Diego, CA" }
    ]

    return locations
      .filter(loc => 
        loc.name.toLowerCase().includes(query.toLowerCase()) ||
        loc.address.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 5)
      .map((loc, index) => ({
        place_id: `mock_${index}`,
        description: `${loc.name}, ${loc.address}`,
        structured_formatting: {
          main_text: loc.name,
          secondary_text: loc.address
        }
      }))
  }

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)

    if (newValue.length > 2) {
      setIsLoading(true)
      
      // Simulate API delay
      setTimeout(() => {
        const mockSuggestions = getMockSuggestions(newValue)
        setSuggestions(mockSuggestions)
        setShowSuggestions(true)
        setIsLoading(false)
      }, 300)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  const handleSuggestionClick = (suggestion: Suggestion) => {
    onChange(suggestion.structured_formatting.main_text)
    if (onAddressChange) {
      onAddressChange(suggestion.structured_formatting.secondary_text)
    }
    setSuggestions([])
    setShowSuggestions(false)
  }

  const handleFocus = () => {
    if (value.length > 2) {
      const mockSuggestions = getMockSuggestions(value)
      setSuggestions(mockSuggestions)
      setShowSuggestions(true)
    }
  }

  const handleBlur = () => {
    // Delay hiding suggestions to allow click events
    setTimeout(() => {
      setShowSuggestions(false)
    }, 200)
  }

  return (
    <div className="relative w-full">
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={cn(
          "bg-transparent border-none text-white placeholder:text-slate-400 px-0 focus:ring-0",
          className
        )}
      />
      {isLoading && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />
      )}

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-[100] mt-1 bg-slate-800/95 backdrop-blur-md border border-slate-700 rounded-lg shadow-2xl max-h-60 overflow-y-auto">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.place_id}
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors border-b border-slate-700 last:border-b-0"
            >
              <div className="text-white font-medium">
                {suggestion.structured_formatting.main_text}
              </div>
              <div className="text-slate-400 text-sm">
                {suggestion.structured_formatting.secondary_text}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
} 