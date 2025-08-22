import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { CATEGORIES } from "@/lib/types"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Check if categories already exist
    const { data: existingCategories, error: fetchError } = await supabase
      .from("categories")
      .select("name")
    
    if (fetchError) {
      console.error("Error fetching existing categories:", fetchError)
      return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 })
    }
    
    const existingNames = existingCategories?.map(cat => cat.name) || []
    const categoriesToCreate = CATEGORIES.filter(category => !existingNames.includes(category))
    
    if (categoriesToCreate.length === 0) {
      return NextResponse.json({ message: "All categories already exist", categories: existingNames })
    }
    
    // Create missing categories
    const categoryRows = categoriesToCreate.map(name => ({ name }))
    const { data, error } = await supabase
      .from("categories")
      .insert(categoryRows)
      .select()
    
    if (error) {
      console.error("Error creating categories:", error)
      return NextResponse.json({ error: "Failed to create categories" }, { status: 500 })
    }
    
    return NextResponse.json({ 
      message: "Categories ensured successfully", 
      created: categoriesToCreate,
      existing: existingNames,
      all_categories: [...existingNames, ...categoriesToCreate]
    })
    
  } catch (error) {
    console.error("Unexpected error in ensure-categories:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    const { data: categories, error } = await supabase
      .from("categories")
      .select("*")
      .order("name")
    
    if (error) {
      console.error("Error fetching categories:", error)
      return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 })
    }
    
    return NextResponse.json({ categories: categories || [] })
    
  } catch (error) {
    console.error("Unexpected error in get categories:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
