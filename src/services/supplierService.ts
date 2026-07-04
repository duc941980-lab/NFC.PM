import { supabase } from "../supabaseClient";

export interface Supplier {
  id: string;
  code: string;
  name: string;
  region_id?: string;
}

export async function getSuppliers() {
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .order("name");

  if (error) throw error;

  return data ?? [];
}

export async function addSupplier(supplier: Omit<Supplier, "id">) {
  const { data, error } = await supabase
    .from("suppliers")
    .insert(supplier)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function deleteSupplier(id: string) {
  const { error } = await supabase
    .from("suppliers")
    .delete()
    .eq("id", id);

  if (error) throw error;
}