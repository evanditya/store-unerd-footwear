"use client";

import { useState, useMemo } from "react";

interface Variant { variant_type: string; variant_name: string; price: number | null; price_modifier: number; stock: number; is_available: boolean; }
interface Product { name: string; slug: string; price: number; original_price: number | null; category: string; description: string; sold_count: number; stock: number; rating: number; primary_image: string; images: string[]; variants: Variant[]; }
interface ProductDetailProps { product: Product; formatPrice: (price: number) => string; formatSoldCount: (count: number) => string; onClose: () => void; onAddToCart: (product: Product, variantName?: string, quantity?: number) => void; }

function getVariantPrice(v: Variant, basePrice: number): number {
  if (v.price != null) return v.price;
  return basePrice + (v.price_modifier || 0);
}

export default function ProductDetail({ product, formatPrice, formatSoldCount, onClose, onAddToCart }: ProductDetailProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const images = product.images.length > 0 ? product.images : [product.primary_image];

  const variantTypes = useMemo(() => {
    const types: string[] = [];
    const seen = new Set<string>();
    for (const v of product.variants) {
      const t = v.variant_type || "Pilihan";
      if (!seen.has(t)) { seen.add(t); types.push(t); }
    }
    return types;
  }, [product.variants]);

  const variantsByType = useMemo(() => {
    const groups: Record<string, Variant[]> = {};
    for (const v of product.variants) {
      const type = v.variant_type || "Pilihan";
      if (!groups[type]) groups[type] = [];
      groups[type].push(v);
    }
    return groups;
  }, [product.variants]);

  const hasDifferentPrices = useMemo(() => {
    if (product.variants.length <= 1) return false;
    const prices = product.variants.map((v) => getVariantPrice(v, product.price));
    return new Set(prices).size > 1;
  }, [product.variants, product.price]);

  const selectedNames = Object.values(selectedVariants);
  const currentVariant = product.variants.find((v) => selectedNames.includes(v.variant_name));
  const displayPrice = currentVariant ? getVariantPrice(currentVariant, product.price) : product.price;
  const combinedVariantName = variantTypes.map((t) => selectedVariants[t]).filter(Boolean).join(" / ") || undefined;

  const handleSelectVariant = (type: string, name: string) => {
    setSelectedVariants((prev) => {
      if (prev[type] === name) {
        const next = { ...prev };
        delete next[type];
        return next;
      }
      return { ...prev, [type]: name };
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" data-testid="product-detail-modal">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg rounded-t-2xl max-h-[90vh] flex flex-col animate-fade-in">
        <div className="flex-1 overflow-y-auto p-4 pb-24">
          <button onClick={onClose} className="absolute top-3 right-3 z-10 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center" data-testid="button-close-detail">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <div className="aspect-square rounded-lg overflow-hidden mb-3"><img src={images[selectedImage]} alt={product.name} className="w-full h-full object-cover" /></div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto mb-4">
              {images.map((img, i) => (<button key={i} onClick={() => setSelectedImage(i)} className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 ${i === selectedImage ? "border-gray-900" : "border-transparent"}`}><img src={img} alt="" className="w-full h-full object-cover" /></button>))}
            </div>
          )}
          <h2 className="text-lg font-bold mb-1">{product.name}</h2>
          <p className="text-2xl font-bold text-red-600 mb-1">{formatPrice(displayPrice)}</p>
          {product.original_price && product.original_price > displayPrice && <p className="text-sm text-gray-400 line-through mb-2">{formatPrice(product.original_price)}</p>}
          <p className="text-sm text-gray-500 mb-4">{formatSoldCount(product.sold_count)}</p>
          {product.variants.length > 0 && (
            <div className="mb-4">
              {variantTypes.map((type) => (
                <div key={type} className="mb-3">
                  <p className="text-sm font-medium mb-2">{type}:</p>
                  <div className="flex flex-wrap gap-2">
                    {(variantsByType[type] || []).filter((v) => v.is_available).map((v) => {
                      const vPrice = getVariantPrice(v, product.price);
                      const showPrice = hasDifferentPrices && vPrice !== product.price;
                      const isSelected = selectedVariants[type] === v.variant_name;
                      return (
                        <button
                          key={v.variant_name}
                          onClick={() => handleSelectVariant(type, v.variant_name)}
                          className={`px-3 py-1.5 rounded-lg text-sm border transition ${isSelected ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 hover:border-gray-400"}`}
                          data-testid={`button-variant-${v.variant_name}`}
                        >
                          <span>{v.variant_name}</span>
                          {showPrice && <span className="block text-xs opacity-75">{formatPrice(vPrice)}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mb-4">
            <p className="text-sm font-medium mb-2">Jumlah:</p>
            <div className="flex items-center gap-3">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 rounded border flex items-center justify-center" data-testid="button-qty-decrease">-</button>
              <span className="w-8 text-center">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} className="w-8 h-8 rounded border flex items-center justify-center" data-testid="button-qty-increase">+</button>
            </div>
          </div>
          {product.description && (<div><p className="text-sm font-medium mb-2">Deskripsi:</p><p className="text-sm text-gray-600 whitespace-pre-line">{product.description}</p></div>)}
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t p-4">
          <button onClick={() => onAddToCart(product, combinedVariantName, quantity)} className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition" data-testid="button-add-to-cart">Tambah ke Keranjang - {formatPrice(displayPrice * quantity)}</button>
        </div>
      </div>
    </div>
  );
}
