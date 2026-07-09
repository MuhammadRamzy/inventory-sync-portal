"use client";

interface CategoryFilterPillsProps {
  categories: string[];
  selectedCategory: string | null;
  onChange: (category: string | null) => void;
}

export default function CategoryFilterPills({
  categories,
  selectedCategory,
  onChange,
}: CategoryFilterPillsProps) {
  return (
    <div className="flex flex-wrap gap-1.5 scrollbar-none overflow-x-auto py-1">
      <button
        onClick={() => onChange(null)}
        className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider border transition-colors ${
          selectedCategory === null
            ? "bg-indigo-600 border-indigo-600 text-white"
            : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
        } rounded-none`}
      >
        All Products
      </button>
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onChange(category)}
          className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider border transition-colors whitespace-nowrap ${
            selectedCategory === category
              ? "bg-indigo-600 border-indigo-600 text-white"
              : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
          } rounded-none`}
        >
          {category}
        </button>
      ))}
    </div>
  );
}
