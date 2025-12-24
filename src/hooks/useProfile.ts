import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";

export interface Profile {
  id: string;
  name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  gender: string | null;
  birth_date: string | null;
  phone: string | null;
  country: string | null;
  job_description: string | null;
  role: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpdateParams {
  name?: string;
  display_name?: string;
  avatar_url?: string;
  gender?: string;
  birth_date?: string | null;
  phone?: string;
  country?: string;
  job_description?: string;
}

export function useProfile(user: User | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (err: any) {
      console.error("Error fetching profile:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateProfile = async (updates: ProfileUpdateParams) => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      // Update local state
      setProfile((prev) => (prev ? { ...prev, ...updates } : null));

      return true;
    } catch (err: any) {
      console.error("Error updating profile:", err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return null;
    setLoading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("review_files") // Consider changing to 'avatars' bucket later
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("review_files").getPublicUrl(filePath);
      return data.publicUrl;
    } catch (err: any) {
      console.error("Error uploading avatar:", err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    loading,
    error,
    refetch: fetchProfile,
    updateProfile,
    uploadAvatar,
  };
}
