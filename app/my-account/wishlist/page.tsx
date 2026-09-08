"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useWishlist, toggleWishlist } from "@/lib/wishlist";
import { products, toman } from "@/lib/products";

export default function WishlistPage() {
  const ids = useWishlist();
  const [listName, setListName] = useState("لیست علاقه‌مندی‌های من");
  const [editing, setEditing] = useState(false);

  const items = products.filter((p) => ids.includes(p.id));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        {editing ? (
          <input
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            onBlur={() => setEditing(false)}
            autoFocus
            className="h-8 flex-1 rounded-lg bg-modi-gray-300 px-2 text-sm"
          />
        ) : (
          <h2 className="text-sm font-bold">{listName}</h2>
        )}
        <button
          onClick={() => setEditing((v) => !v)}
          className="shrink-0 text-xs text-modi-purple-800"
        >
          ویرایش عنوان
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-y border-modi-gray-500 text-modi-gray-900">
              <th className="p-2 text-right font-normal">نام محصول</th>
              <th className="p-2 text-right font-normal">قیمت واحد</th>
              <th className="p-2 text-right font-normal">وضعیت موجودی</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="py-8 text-center text-modi-gray-900"
                >
                  هیچ محصولی به لیست دلخواه شما اضافه نشده است.
                </td>
              </tr>
            ) : (
              items.map((p) => (
                <tr key={p.id} className="border-t border-modi-gray-500">
                  <td className="p-2">
                    <Link
                      href={`/product/${p.slug}`}
                      className="flex items-center gap-2"
                    >
                      <Image
                        src={p.image}
                        alt=""
                        width={36}
                        height={45}
                        className="h-11 w-9 rounded object-cover"
                      />
                      <span className="line-clamp-2">{p.name}</span>
                    </Link>
                  </td>
                  <td className="p-2 whitespace-nowrap">
                    {toman(p.salePrice > 0 ? p.salePrice : p.price)}
                  </td>
                  <td className="p-2 text-modi-purple-800">
                    {p.meters > 0 ? "موجود" : "ناموجود"}
                  </td>
                  <td className="p-2">
                    <button
                      onClick={() => toggleWishlist(p.id)}
                      className="text-[#C40000]"
                      aria-label="حذف"
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
