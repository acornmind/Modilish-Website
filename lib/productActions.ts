"use server";

import { revalidatePath } from "next/cache";
import {
  createProduct,
  deleteProduct,
  deleteUpload,
  duplicateProduct,
  importProducts,
  listMedia,
  renameAttributeValue,
  saveUpload,
  updateProduct,
  type AttributeType,
  type ImportRow,
  type NewProductInput,
  type ProductPatch,
} from "./productStore";

export async function listMediaAction() {
  return listMedia();
}

export async function importProductsAction(rows: ImportRow[]) {
  const result = await importProducts(rows);
  revalidatePath("/", "layout");
  return result;
}

export async function renameAttributeValueAction(type: AttributeType, from: string, to: string) {
  const touched = await renameAttributeValue(type, from, to);
  revalidatePath("/", "layout");
  return { touched };
}

function revalidateStorefront(slug?: string) {
  revalidatePath("/", "layout");
  if (slug) revalidatePath(`/product/${slug}`);
}

export async function updateProductAction(slug: string, patch: ProductPatch) {
  const product = await updateProduct(slug, patch);
  revalidateStorefront(slug);
  return { name: product.name, price: product.price, meters: product.meters };
}

export async function createProductAction(input: NewProductInput) {
  const product = await createProduct(input);
  revalidateStorefront(product.slug);
  return { slug: product.slug };
}

export async function duplicateProductAction(slug: string) {
  const product = await duplicateProduct(slug);
  revalidateStorefront(product.slug);
  return { slug: product.slug };
}

export async function deleteProductAction(slug: string) {
  await deleteProduct(slug);
  revalidateStorefront(slug);
}

export async function uploadMediaAction(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("فایلی انتخاب نشده است");
  const url = await saveUpload(file);
  revalidatePath("/admin/media");
  return { url };
}

export async function deleteMediaAction(url: string) {
  await deleteUpload(url);
  revalidatePath("/admin/media");
}
