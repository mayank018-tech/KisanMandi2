export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          full_name: string
          mobile_number: string
          email: string
          role: 'farmer' | 'buyer'
          state: string
          district: string
          village: string
          language_preference: 'en' | 'hi' | 'gu'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          mobile_number: string
          email: string
          role: 'farmer' | 'buyer'
          state: string
          district: string
          village: string
          language_preference?: 'en' | 'hi' | 'gu'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          mobile_number?: string
          email?: string
          role?: 'farmer' | 'buyer'
          state?: string
          district?: string
          village?: string
          language_preference?: 'en' | 'hi' | 'gu'
          created_at?: string
          updated_at?: string
        }
      }
      crop_listings: {
        Row: {
          id: string
          farmer_id: string
          crop_name: string
          quantity: number
          unit: string
          expected_price: number
          location: string
          contact_number: string
          photo_url: string | null
          description: string | null
          status: 'active' | 'sold' | 'expired'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          farmer_id: string
          crop_name: string
          quantity: number
          unit?: string
          expected_price: number
          location: string
          contact_number: string
          photo_url?: string | null
          description?: string | null
          status?: 'active' | 'sold' | 'expired'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          farmer_id?: string
          crop_name?: string
          quantity?: number
          unit?: string
          expected_price?: number
          location?: string
          contact_number?: string
          photo_url?: string | null
          description?: string | null
          status?: 'active' | 'sold' | 'expired'
          created_at?: string
          updated_at?: string
        }
      }
      offers: {
        Row: {
          id: string
          listing_id: string
          buyer_id: string
          farmer_id: string
          offer_price: number
          message: string
          status: 'pending' | 'accepted' | 'rejected'
          created_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          buyer_id: string
          farmer_id: string
          offer_price: number
          message: string
          status?: 'pending' | 'accepted' | 'rejected'
          created_at?: string
        }
        Update: {
          id?: string
          listing_id?: string
          buyer_id?: string
          farmer_id?: string
          offer_price?: number
          message?: string
          status?: 'pending' | 'accepted' | 'rejected'
          created_at?: string
        }
      }
      mandi_prices: {
        Row: {
          id: string
          crop_name: string
          state: string
          district: string
          mandi_name: string
          min_price: number
          max_price: number
          average_price: number
          price_date: string
          created_at: string
        }
        Insert: {
          id?: string
          crop_name: string
          state: string
          district: string
          mandi_name: string
          min_price: number
          max_price: number
          average_price: number
          price_date: string
          created_at?: string
        }
        Update: {
          id?: string
          crop_name?: string
          state?: string
          district?: string
          mandi_name?: string
          min_price?: number
          max_price?: number
          average_price?: number
          price_date?: string
          created_at?: string
        }
      }
    }
  }
}
