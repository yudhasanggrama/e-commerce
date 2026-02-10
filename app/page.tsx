import ProductList from "@/components/home/ProductList";

export default function Home() {
  return (
    <div className="bg-background px-4 py-8 sm:py-12 lg:py-16 lg:px-8 min-h-screen">
      <div className="text-center mx-auto mb-18 space-y-3">
        <h1 className="text-primary leading-tighter text-4xl font-semibold tracking-tight text-balance lg:leading-[1.1] xl:text-5xl xl:tracking-tighter">
          Discover Your Next Smartphone
        </h1>

        <p className="text-foreground text-base max-w-3xl mx-auto text-balance sm:text-lg">
          Explore the latest smartphones featuring powerful performance,
          stunning cameras, and long-lasting battery life. Find the perfect
          device that matches your lifestyle — from flagship models to
          budget-friendly options.
        </p>
      </div>

      <ProductList />
    </div>
  );
}
