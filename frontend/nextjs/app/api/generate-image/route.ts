import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { createServerClient } from "@/lib/supabase/server"

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
})

interface GenerateImageRequest {
  prompt: string
  size?: "1024x1024" | "1792x1024" | "1024x1792"
  quality?: "standard" | "hd"
  n?: number
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, size = "1024x1024", quality = "standard", n = 1 }: GenerateImageRequest = await request.json()

    if (!prompt?.trim()) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      )
    }

    // Enhance the prompt for better school event images
    const enhancedPrompt = `High school event: ${prompt}. Modern, vibrant, energetic atmosphere suitable for teenagers. Professional photography style, bright lighting, engaging composition.`

    // Generate image with OpenAI
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: enhancedPrompt,
      size: size,
      quality: quality,
      n: n,
    })

    const imageUrl = response.data[0]?.url
    
    if (!imageUrl) {
      throw new Error("No image URL returned from OpenAI")
    }

    // Download the image and upload to Supabase storage
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error("Failed to download generated image")
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    const fileName = `ai-generated-${Date.now()}-${Math.random().toString(36).substring(2)}.png`

    // Upload to Supabase storage
    const supabase = await createServerClient()
    const { data, error } = await supabase.storage
      .from('event-images')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
      })

    if (error) {
      console.error('Supabase upload error:', error)
      throw new Error("Failed to save generated image")
    }

    return NextResponse.json({
      imagePath: data.path,
      originalUrl: imageUrl
    })

  } catch (error: any) {
    console.error("Generate image API error:", error)
    
    // Handle specific OpenAI errors
    if (error?.status === 400) {
      return NextResponse.json(
        { error: "Invalid request to image generation service" },
        { status: 400 }
      )
    }
    
    if (error?.status === 429) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 }
    )
  }
} 