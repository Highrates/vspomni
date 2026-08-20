"""
Запускать на сервере внутри saleor_api:

  docker exec -i saleor_api python3 manage.py shell < /path/to/diagnose-stock-saleor.py

Или вставить код в:
  docker exec -it saleor_api python3 manage.py shell
"""

from saleor.channel.models import Channel
from saleor.product.models import ProductVariant
from saleor.warehouse.models import Stock, Warehouse

print("=== CHANNELS + WAREHOUSES ===")
for c in Channel.objects.all().prefetch_related("warehouses"):
    whs = [(w.id, w.slug, w.name) for w in c.warehouses.all()]
    print(f"channel id={c.id} slug={c.slug!r} name={c.name!r}")
    print(f"  linked warehouses: {whs or 'NONE — quantityAvailable всегда 0!'}")

print("\n=== ALL WAREHOUSES + SHIPPING ZONES ===")
for w in Warehouse.objects.all().prefetch_related("shipping_zones"):
    zones = list(w.shipping_zones.values_list("name", flat=True))
    print(f"wh id={w.id} slug={w.slug!r} name={w.name!r} zones={zones or 'NONE'}")

TARGET_SLUGS = [
    "diffuzor-dlia-doma-s-palochkami-chistyi-khlopok",
    "diffuzor-dlia-doma-s-palochkami-detstvo",
]

print("\n=== STOCK ROWS FOR SAMPLE VARIANTS ===")
for slug in TARGET_SLUGS:
    variants = ProductVariant.objects.filter(product__slug=slug).select_related(
        "product"
    )
    for v in variants:
        print(
            f"\n{slug} | variant_id={v.id} sku={v.sku!r} "
            f"track_inventory={v.track_inventory}"
        )
        stocks = Stock.objects.filter(product_variant=v).select_related("warehouse")
        if not stocks.exists():
            print("  NO Stock rows")
            continue
        for s in stocks:
            avail = s.quantity - s.quantity_allocated
            print(
                f"  stock wh={s.warehouse.slug!r} qty={s.quantity} "
                f"alloc={s.quantity_allocated} avail={avail}"
            )

print("\n=== SUMMARY: variants with stock>0 vs channel warehouses ===")
channel = Channel.objects.filter(slug="vspomni-site").first()
if not channel:
    print("channel vspomni-site not found")
else:
    channel_wh_ids = set(channel.warehouses.values_list("id", flat=True))
    print(f"vspomni-site warehouse ids: {channel_wh_ids or 'EMPTY'}")
    with_any = Stock.objects.filter(quantity__gt=0).count()
    with_on_channel = Stock.objects.filter(
        quantity__gt=0, warehouse_id__in=channel_wh_ids
    ).count()
    print(f"Stock rows qty>0 total: {with_any}")
    print(f"Stock rows qty>0 on channel warehouses: {with_on_channel}")
