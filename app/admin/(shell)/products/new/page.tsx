import NewProductForm from "./NewProductForm";

export const metadata = { title: "افزودن پارچه" };

export default function AdminNewProductPage() {
  return (
    <div>
      <p className="mb-4 text-base font-bold">افزودن پارچه</p>
      <NewProductForm />
    </div>
  );
}
