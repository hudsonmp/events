/**
 * Utility functions for handling Instagram profile pictures and student data
 */

/**
 * Constructs the profile picture URL from the instagram-pfp storage bucket
 * @param username - The Instagram username
 * @returns The full URL to the profile picture
 */
export function getInstagramProfilePicUrl(username: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL
  return `${baseUrl}/storage/v1/object/public/instagram-pfp/${username}.jpg`
}

/**
 * Transforms a student record to include the constructed profile picture URL
 * @param student - The student record from the database
 * @returns The student record with profile_pic_url added
 */
export function addProfilePicUrl<T extends { username: string }>(student: T): T & { profile_pic_url: string } {
  return {
    ...student,
    profile_pic_url: getInstagramProfilePicUrl(student.username)
  }
}

/**
 * Transforms an array of student records to include constructed profile picture URLs
 * @param students - Array of student records from the database
 * @returns Array of student records with profile_pic_url added
 */
export function addProfilePicUrls<T extends { username: string }>(students: T[]): Array<T & { profile_pic_url: string }> {
  return students.map(addProfilePicUrl)
}

/**
 * Handles profile picture loading errors gracefully
 * @param username - The Instagram username
 * @returns A fallback URL or null if no fallback is available
 */
export function getProfilePicFallback(username: string): string | null {
  // Could return a default avatar URL or null
  return null
}
