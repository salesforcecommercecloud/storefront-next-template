# Local Development Fallback System

This folder contains local fallback data for development and testing purposes. It provides a way to work with page data locally when the Commerce Cloud API is unavailable or when you need to test specific page configurations.

## 📋 Table of Contents

- [What is this?](#what-is-this)
- [When does it take effect?](#when-does-it-take-effect)
- [Advantages](#advantages)
- [Folder Structure](#folder-structure)
- [How to Use](#how-to-use)
- [Adding Components for Testing](#adding-components-for-testing)

## What is this?

The `_local` folder contains JSON files that serve as fallback data when the Salesforce Commerce Cloud Page Designer API is unavailable or returns errors. This system allows developers to:

- Continue working when the API is down
- Test specific page configurations locally
- Develop and test new components without needing live API data
- Create reproducible test scenarios

## When does it take effect?

The fallback system is **only active in development mode** and triggers when:

1. **Development Environment**: Only when `NODE_ENV !== 'production'`
2. **API Errors**: When the Commerce Cloud Page Designer API returns error responses (4xx, 5xx)
3. **Network Issues**: When the API request fails due to connectivity problems
4. **Missing Pages**: When a requested page doesn't exist in Commerce Cloud (this is most likely the case for new environments where page designer pages weren't imported or manually created)

**Important**: This system is completely disabled in production builds.

## Advantages

### 🚀 **Development Productivity**
- Work offline or with ecom instances without page designer set up
- Faster iteration cycles without API round trips
- Consistent test data across team members

### 🧪 **Testing & QA**
- Create specific test scenarios for edge cases
- Test component behavior with various data configurations
- Reproduce bugs with exact data conditions

### 🔧 **Component Development**
- Test new components before they're available in Page Designer
- Validate component props and rendering
- Experiment with different content structures

### 👥 **Team Collaboration**
- Share page configurations via version control
- Ensure consistent development environments
- Document component usage examples

## Folder Structure

```
_local/
├── README.md              # This documentation
└── pages/                 # Page fallback data
    ├── homepage.json      # Homepage fallback
    ├── category.json      # Category page fallback
    ├── product.json       # Product page fallback
    └── custom-page.json   # Custom page examples
```

## How to Use

### 1. Create a Page JSON File

Create a JSON file in `_local/pages/` with the page ID as the filename:

```bash
# For a page with ID "homepage"
_local/pages/homepage.json

# For a page with ID "category-electronics"
_local/pages/category-electronics.json
```

### 2. Access the Page

Navigate to the page URL in your browser. If the API fails, the fallback will automatically load the page with a file name matching your routes page:

```
http://localhost:5173/
# Falls back to _local/pages/homepage.json if API fails (the 'homepage' is set to be loaded in the _index.ts file)
```

### 3. Monitor Console Output

Watch the browser console for fallback activity:

```
❌ Fetch page error: 404 /api/experience/shopper-experience/organizations/f_ecom_zzrf_001/pages/homepage
✅ Serving fallback for homepage
```

## Adding Components for Testing

### Basic Component Structure

Each page JSON should follow the Commerce Cloud Page Designer format:

```json
{
  "id": "homepage",
  "name": "Homepage",
  "description": "Homepage with hero and product grid",
  "pageTitle": "Welcome to Our Store",
  "pageDescription": "Discover amazing products",
  "pageKeywords": "ecommerce, products, shopping",
  "data": {},
  "regions": [
    {
      "id": "main",
      "components": [
        {
          "id": "hero-banner-1",
          "typeId": "hero",
          "data": {
            "title": "Welcome to Our Store",
            "subtitle": "Discover amazing products at great prices",
            "backgroundImage": "/images/hero-bg.jpg",
            "ctaText": "Shop Now",
            "ctaLink": "/products"
          }
        }
      ]
    }
  ]
}
```

### Adding Multiple Components

```json
{
  "regions": [
    {
      "id": "main",
      "components": [
        {
          "id": "hero-1",
          "typeId": "hero",
          "data": {
            "title": "Hero Banner",
            "subtitle": "Test subtitle"
          }
        },
        {
          "id": "product-grid-1",
          "typeId": "productGrid",
          "data": {
            "title": "Featured Products",
            "maxProducts": 8,
            "categoryId": "electronics"
          }
        },
        {
          "id": "text-block-1",
          "typeId": "textBlock",
          "data": {
            "content": "<h2>About Us</h2><p>We are a leading retailer...</p>"
          }
        }
      ]
    }
  ]
}
```
