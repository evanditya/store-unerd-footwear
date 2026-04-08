from fastapi import APIRouter, Depends, Request, File, UploadFile
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Product, ProductImage, ProductVariant, StoreBanner, gen_id
from app.routes.auth import get_current_user
import json
import math
import os
import re
import random
import string

router = APIRouter(prefix="/api")

SELLER_CONFIG_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "seller_config.json")
STORE_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
FRONTEND_PUBLIC_IMAGES = os.path.join(STORE_ROOT, "frontend", "public", "images")

DEFAULT_BRAND_COLORS = {"primary": "#111827", "accent": "#ef4444"}
AVAILABLE_FONTS = ["Inter", "Poppins", "Nunito", "Raleway", "Lato"]


def load_seller_config():
    if os.path.exists(SELLER_CONFIG_PATH):
        with open(SELLER_CONFIG_PATH, "r") as f:
            return json.load(f)
    return {"username": "seller", "seller_name": "Store", "profile_picture": "", "logo": "", "banner": "", "favicon": "", "favicon_v": "", "brand_colors": DEFAULT_BRAND_COLORS, "font": "Inter"}


def save_seller_config(config: dict):
    with open(SELLER_CONFIG_PATH, "w") as f:
        json.dump(config, f, indent=2)


def branding_from_config(config: dict) -> dict:
    colors = config.get("brand_colors", {})
    if not isinstance(colors, dict):
        colors = {}
    return {
        "store_name": config.get("seller_name", "Store"),
        "logo": config.get("logo", ""),
        "banner": config.get("banner", ""),
        "favicon": config.get("favicon", ""),
        "favicon_v": config.get("favicon_v", ""),
        "font": config.get("font", "Inter"),
        "brand_colors": {
            "primary": colors.get("primary", DEFAULT_BRAND_COLORS["primary"]),
            "accent": colors.get("accent", DEFAULT_BRAND_COLORS["accent"]),
        },
    }


def product_to_dict(product: Product) -> dict:
    desc_images = []
    if product.description_images:
        try:
            desc_images = json.loads(product.description_images)
        except Exception:
            desc_images = []
    specs = []
    if product.specifications:
        try:
            specs = json.loads(product.specifications)
        except Exception:
            specs = []
    return {
        "id": product.id,
        "name": product.name,
        "slug": product.slug,
        "price": product.price,
        "original_price": product.original_price,
        "category": product.category,
        "description": product.description,
        "description_images": desc_images,
        "specifications": specs,
        "sold_count": product.sold_count,
        "stock": product.stock,
        "rating": product.rating,
        "weight": product.weight or 500,
        "length": product.length or 10,
        "width": product.width or 10,
        "height": product.height or 10,
        "primary_image": product.primary_image,
        "video_url": product.video_url,
        "images": [{"id": img.id, "image_url": img.image_url, "display_order": img.display_order} for img in product.images],
        "variants": [
            {
                "id": v.id,
                "variant_type": v.variant_type,
                "variant_name": v.variant_name,
                "price": v.price,
                "price_modifier": v.price_modifier,
                "stock": v.stock,
                "is_available": v.is_available,
            }
            for v in product.variants
        ],
    }


def generate_slug(name: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
    return f"{base}-{suffix}"


@router.get("/products")
async def list_products(
    category: str = None,
    search: str = None,
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    query = db.query(Product)
    if category:
        query = query.filter(Product.category == category)
    if search and search.strip():
        q = f"%{search.strip()}%"
        query = query.filter(
            Product.name.ilike(q) | Product.category.ilike(q) | Product.description.ilike(q)
        )
    total = query.count()
    limit = max(1, min(limit, 100))
    page = max(1, page)
    total_pages = max(1, math.ceil(total / limit)) if total > 0 else 1
    page = min(page, total_pages)
    offset = (page - 1) * limit
    products = query.order_by(Product.sold_count.desc(), Product.id).offset(offset).limit(limit).all()
    seller = load_seller_config()
    return {
        "products": [product_to_dict(p) for p in products],
        "seller": seller,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
    }


@router.get("/products/{slug}")
async def get_product(slug: str, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.slug == slug).first()
    if not product:
        return JSONResponse({"error": "Produk tidak ditemukan"}, status_code=404)
    return {"product": product_to_dict(product)}


@router.post("/products")
async def create_product(request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    if not user or user.role != "seller":
        return JSONResponse({"error": "Akses ditolak"}, status_code=403)
    body = await request.json()
    slug = generate_slug(body.get("name", "product"))
    product = Product(
        id=gen_id(),
        name=body.get("name", ""),
        slug=slug,
        price=body.get("price", 0),
        original_price=body.get("original_price"),
        category=body.get("category"),
        description=body.get("description"),
        sold_count=body.get("sold_count", 0),
        stock=body.get("stock", 0),
        rating=body.get("rating", 0),
        weight=body.get("weight", 500),
        length=body.get("length", 10),
        width=body.get("width", 10),
        height=body.get("height", 10),
        primary_image=body.get("primary_image"),
        video_url=body.get("video_url"),
    )
    db.add(product)
    for img in body.get("images", []):
        db.add(ProductImage(id=gen_id(), product_id=product.id, image_url=img.get("image_url", img if isinstance(img, str) else ""), display_order=img.get("display_order", 0) if isinstance(img, dict) else 0))
    for v in body.get("variants", []):
        db.add(ProductVariant(
            id=gen_id(), product_id=product.id,
            variant_type=v.get("variant_type"), variant_name=v.get("variant_name", ""),
            price=v.get("price"), price_modifier=v.get("price_modifier", 0),
            stock=v.get("stock", 0), is_available=v.get("is_available", True),
        ))
    db.commit()
    db.refresh(product)
    return {"product": product_to_dict(product)}


@router.put("/products/{slug}")
async def update_product(slug: str, request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    if not user or user.role != "seller":
        return JSONResponse({"error": "Akses ditolak"}, status_code=403)
    product = db.query(Product).filter(Product.slug == slug).first()
    if not product:
        return JSONResponse({"error": "Produk tidak ditemukan"}, status_code=404)
    body = await request.json()
    for field in ["name", "price", "original_price", "category", "description", "stock", "rating", "weight", "length", "width", "height", "primary_image", "video_url", "sold_count"]:
        if field in body:
            setattr(product, field, body[field])

    if "variants" in body:
        db.query(ProductVariant).filter(ProductVariant.product_id == product.id).delete()
        for v in body["variants"]:
            db.add(ProductVariant(
                id=gen_id(), product_id=product.id,
                variant_type=v.get("variant_type", ""),
                variant_name=v.get("variant_name", ""),
                price=v.get("price"),
                price_modifier=v.get("price_modifier", 0),
                stock=v.get("stock", 0),
                is_available=v.get("is_available", True),
            ))

    db.commit()
    db.refresh(product)
    return {"product": product_to_dict(product)}


@router.get("/categories")
async def list_categories(db: Session = Depends(get_db)):
    products = db.query(Product.category).distinct().all()
    categories = sorted([p[0] for p in products if p[0]])
    return {"categories": categories}


@router.delete("/products/{slug}")
async def delete_product(slug: str, request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    if not user or user.role != "seller":
        return JSONResponse({"error": "Akses ditolak"}, status_code=403)
    product = db.query(Product).filter(Product.slug == slug).first()
    if not product:
        return JSONResponse({"error": "Produk tidak ditemukan"}, status_code=404)
    db.delete(product)
    db.commit()
    return {"success": True}


@router.get("/site-settings")
async def get_site_settings():
    config = load_seller_config()
    b = branding_from_config(config)
    return {
        "site_name": b["store_name"] or config.get("seller_name", "Store"),
        "description": f"{b['store_name'] or config.get('seller_name', 'Store')} - Toko Online",
        "logo": b["logo"],
        "favicon": b["favicon"],
        "favicon_v": b["favicon_v"],
        "font": b["font"],
        "brand_colors": b["brand_colors"],
    }


@router.get("/branding")
async def get_branding():
    config = load_seller_config()
    return branding_from_config(config)


@router.post("/branding")
async def save_branding(request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    if not user or user.role != "seller":
        return JSONResponse({"error": "Akses ditolak"}, status_code=403)
    body = await request.json()
    config = load_seller_config()
    if "store_name" in body:
        config["seller_name"] = body["store_name"].strip() or config.get("seller_name", "Store")
    if "font" in body and body["font"] in AVAILABLE_FONTS:
        config["font"] = body["font"]
    if "brand_colors" in body and isinstance(body["brand_colors"], dict):
        existing = config.get("brand_colors", {})
        if not isinstance(existing, dict):
            existing = {}
        existing.update({k: v for k, v in body["brand_colors"].items() if k in ("primary", "accent")})
        config["brand_colors"] = existing
    save_seller_config(config)
    return {"success": True, "branding": branding_from_config(config)}


async def _save_branding_image(request: Request, db, field: str, file: UploadFile):
    user = get_current_user(request, db)
    if not user or user.role != "seller":
        return JSONResponse({"error": "Akses ditolak"}, status_code=403)
    content_type = file.content_type or ""
    if not content_type.startswith("image/"):
        return JSONResponse({"error": "Hanya file gambar yang diizinkan"}, status_code=400)
    ext_map = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}
    ext = ext_map.get(content_type, ".jpg")
    filename = f"{field}{ext}"
    os.makedirs(FRONTEND_PUBLIC_IMAGES, exist_ok=True)
    file_path = os.path.join(FRONTEND_PUBLIC_IMAGES, filename)
    data = await file.read()
    with open(file_path, "wb") as f:
        f.write(data)
    url = f"/images/{filename}"
    config = load_seller_config()
    config[field] = url
    save_seller_config(config)
    return {"success": True, "url": url}


@router.post("/branding/upload-logo")
async def upload_logo(request: Request, file: UploadFile = File(...), db: Session = Depends(get_db)):
    return await _save_branding_image(request, db, "logo", file)


@router.post("/branding/upload-banner")
async def upload_banner(request: Request, file: UploadFile = File(...), db: Session = Depends(get_db)):
    return await _save_branding_image(request, db, "banner", file)


@router.post("/branding/upload-favicon")
async def upload_favicon(request: Request, file: UploadFile = File(...), db: Session = Depends(get_db)):
    import time
    user = get_current_user(request, db)
    if not user or user.role != "seller":
        return JSONResponse({"error": "Akses ditolak"}, status_code=403)
    content_type = file.content_type or ""
    allowed = ("image/png", "image/x-icon", "image/vnd.microsoft.icon", "image/svg+xml", "image/webp", "image/jpeg")
    if not any(content_type.startswith(a) for a in allowed):
        return JSONResponse({"error": "Format tidak didukung. Gunakan PNG, ICO, SVG, atau WebP."}, status_code=400)
    ext_map = {
        "image/png": ".png",
        "image/x-icon": ".ico",
        "image/vnd.microsoft.icon": ".ico",
        "image/svg+xml": ".svg",
        "image/webp": ".webp",
        "image/jpeg": ".jpg",
    }
    ext = next((v for k, v in ext_map.items() if content_type.startswith(k)), ".png")
    filename = f"favicon{ext}"
    os.makedirs(FRONTEND_PUBLIC_IMAGES, exist_ok=True)
    file_path = os.path.join(FRONTEND_PUBLIC_IMAGES, filename)
    data = await file.read()
    with open(file_path, "wb") as f:
        f.write(data)
    also_public = os.path.join(os.path.dirname(FRONTEND_PUBLIC_IMAGES), filename)
    with open(also_public, "wb") as f:
        f.write(data)
    url = f"/images/{filename}"
    version = str(int(time.time()))
    config = load_seller_config()
    config["favicon"] = url
    config["favicon_v"] = version
    save_seller_config(config)
    return {"success": True, "url": url, "version": version}


# ── Store Banners (carousel) ──────────────────────────────────────────────────

def banner_to_dict(b: StoreBanner) -> dict:
    return {
        "id": b.id,
        "image_url": b.image_url,
        "title": b.title or "",
        "link": b.link or "",
        "display_order": b.display_order,
        "is_active": b.is_active,
    }


@router.get("/banners")
async def list_banners_public(db: Session = Depends(get_db)):
    banners = db.query(StoreBanner).filter(StoreBanner.is_active == True).order_by(StoreBanner.display_order).all()
    return {"banners": [banner_to_dict(b) for b in banners]}


@router.get("/banners/all")
async def list_banners_all(request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    if not user or user.role != "seller":
        return JSONResponse({"error": "Akses ditolak"}, status_code=403)
    banners = db.query(StoreBanner).order_by(StoreBanner.display_order).all()
    return {"banners": [banner_to_dict(b) for b in banners]}


@router.post("/banners/upload")
async def upload_banner_item(request: Request, file: UploadFile = File(...), db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    if not user or user.role != "seller":
        return JSONResponse({"error": "Akses ditolak"}, status_code=403)
    content_type = file.content_type or ""
    if not content_type.startswith("image/"):
        return JSONResponse({"error": "Hanya file gambar yang diizinkan"}, status_code=400)
    ext_map = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
    ext = ext_map.get(content_type, ".jpg")
    filename = f"banner_{gen_id()}{ext}"
    os.makedirs(FRONTEND_PUBLIC_IMAGES, exist_ok=True)
    file_path = os.path.join(FRONTEND_PUBLIC_IMAGES, filename)
    data = await file.read()
    with open(file_path, "wb") as f:
        f.write(data)
    url = f"/images/{filename}"
    max_order = db.query(StoreBanner).count()
    banner = StoreBanner(
        id=gen_id(),
        image_url=url,
        title=request.headers.get("X-Banner-Title", ""),
        link=request.headers.get("X-Banner-Link", ""),
        display_order=max_order,
        is_active=True,
    )
    db.add(banner)
    db.commit()
    db.refresh(banner)
    return {"success": True, "banner": banner_to_dict(banner)}


@router.put("/banners/reorder")
async def reorder_banners(request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    if not user or user.role != "seller":
        return JSONResponse({"error": "Akses ditolak"}, status_code=403)
    body = await request.json()
    items = body.get("items", [])
    for item in items:
        db.query(StoreBanner).filter(StoreBanner.id == item["id"]).update({"display_order": item["order"]})
    db.commit()
    return {"success": True}


@router.put("/banners/{banner_id}")
async def update_banner(banner_id: str, request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    if not user or user.role != "seller":
        return JSONResponse({"error": "Akses ditolak"}, status_code=403)
    banner = db.query(StoreBanner).filter(StoreBanner.id == banner_id).first()
    if not banner:
        return JSONResponse({"error": "Banner tidak ditemukan"}, status_code=404)
    body = await request.json()
    if "title" in body:
        banner.title = body["title"]
    if "link" in body:
        banner.link = body["link"]
    if "is_active" in body:
        banner.is_active = bool(body["is_active"])
    db.commit()
    db.refresh(banner)
    return {"success": True, "banner": banner_to_dict(banner)}


@router.delete("/banners/{banner_id}")
async def delete_banner(banner_id: str, request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    if not user or user.role != "seller":
        return JSONResponse({"error": "Akses ditolak"}, status_code=403)
    banner = db.query(StoreBanner).filter(StoreBanner.id == banner_id).first()
    if not banner:
        return JSONResponse({"error": "Banner tidak ditemukan"}, status_code=404)
    try:
        img_path = os.path.join(FRONTEND_PUBLIC_IMAGES, os.path.basename(banner.image_url))
        if os.path.exists(img_path):
            os.remove(img_path)
    except Exception:
        pass
    db.delete(banner)
    db.commit()
    return {"success": True}
