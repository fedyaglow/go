import json
import os

def split_json(input_file, output_dir):
    # Load the big database.json
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    products = data.get('products', [])
    categories = data.get('categories', [])

    # Ensure output directory exists
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # 1. Save categories to a separate file
    with open(os.path.join(output_dir, 'categories.json'), 'w', encoding='utf-8') as f:
        json.dump(categories, f, indent=2, ensure_ascii=False)

    # 2. Group products by categoryId
    by_category = {}
    for product in products:
        cat_id = product.get('categoryId')
        if cat_id not in by_category:
            by_category[cat_id] = []
        by_category[cat_id].append(product)

    # 3. Save each category group to its own file
    for cat_id, cat_products in by_category.items():
        filename = f'products_{cat_id}.json'
        with open(os.path.join(output_dir, filename), 'w', encoding='utf-8') as f:
            json.dump(cat_products, f, indent=2, ensure_ascii=False)
            
    print(f"Successfully split {len(products)} products into {len(by_category)} category files.")
    print(f"Categories saved to {output_dir}/categories.json")

if __name__ == "__main__":
    split_json('database.json', 'data')
