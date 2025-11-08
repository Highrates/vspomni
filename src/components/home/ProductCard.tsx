export default function ProductCard({ product }: { product: any }) {
  return (
    <div className="rounded-xl overflow-hidden bg-white shadow hover:shadow-lg transition">
      <img
        src={product.image}
        alt={product.title}
        className="w-full h-72 object-cover"
      />
      <div className="p-4">
        <h3 className="font-medium text-lg mb-2">{product.title}</h3>
        <p className="text-brand text-xl font-semibold">
          {product.price.toLocaleString()} ₽
        </p>
      </div>
    </div>
  )
}
