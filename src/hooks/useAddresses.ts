import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import type { UserAddress, AddressInput } from "@/types/address";

export function useAddresses(user: User | null) {
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();

  const fetchAddresses = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAddresses(data ?? []);
    } catch (err: any) {
      console.error("Error fetching addresses:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const createAddress = async (input: AddressInput) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from("user_addresses")
      .insert({
        user_id: user.id,
        recipient_name: input.recipient_name,
        recipient_phone: input.recipient_phone,
        zipcode: input.zipcode,
        address: input.address,
        address_detail: input.address_detail || null,
        is_default: false,
      })
      .select()
      .single();

    if (error) throw error;

    if (input.is_default || addresses.length === 0) {
      const { error: defaultError } = await supabase.rpc("set_default_address", {
        p_address_id: data.id,
      });
      if (defaultError) throw defaultError;
    }

    await fetchAddresses();
    return data as UserAddress;
  };

  const updateAddress = async (id: number, input: AddressInput) => {
    if (!user) return;

    const { error } = await supabase
      .from("user_addresses")
      .update({
        recipient_name: input.recipient_name,
        recipient_phone: input.recipient_phone,
        zipcode: input.zipcode,
        address: input.address,
        address_detail: input.address_detail || null,
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;

    if (input.is_default) {
      const { error: defaultError } = await supabase.rpc("set_default_address", {
        p_address_id: id,
      });
      if (defaultError) throw defaultError;
    }

    await fetchAddresses();
  };

  const deleteAddress = async (id: number) => {
    if (!user) return;

    const { error } = await supabase
      .from("user_addresses")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;
    await fetchAddresses();
  };

  const setDefaultAddress = async (id: number) => {
    if (!user) return;

    const { error } = await supabase.rpc("set_default_address", { p_address_id: id });
    if (error) throw error;
    await fetchAddresses();
  };

  return {
    addresses,
    loading,
    error,
    refetch: fetchAddresses,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
  };
}
