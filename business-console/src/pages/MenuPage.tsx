import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Plus,
  Search,
  Edit,
  MoreHorizontal,
  Eye,
  EyeOff,
  DollarSign,
  Leaf,
  Flame,
  Wheat,
} from 'lucide-react';

export function MenuPage() {
  // Mock menu categories and items
  const categories = [
    {
      id: 1,
      name: 'Appetizers',
      items: [
        {
          id: 1,
          name: 'Crispy Calamari',
          description: 'Lightly battered calamari served with marinara sauce',
          price: 14.99,
          available: true,
          dietary: ['gluten-free-option'],
        },
        {
          id: 2,
          name: 'Bruschetta',
          description: 'Grilled bread topped with tomatoes, basil, and balsamic glaze',
          price: 11.99,
          available: true,
          dietary: ['vegetarian'],
        },
      ],
    },
    {
      id: 2,
      name: 'Main Courses',
      items: [
        {
          id: 3,
          name: 'Grilled Salmon',
          description: 'Atlantic salmon with lemon butter sauce, served with seasonal vegetables',
          price: 28.99,
          available: true,
          dietary: ['gluten-free'],
        },
        {
          id: 4,
          name: 'Ribeye Steak',
          description: '12oz prime ribeye with garlic mashed potatoes and asparagus',
          price: 42.99,
          available: true,
          dietary: [],
        },
        {
          id: 5,
          name: 'Mushroom Risotto',
          description: 'Creamy arborio rice with wild mushrooms and parmesan',
          price: 22.99,
          available: false,
          dietary: ['vegetarian', 'gluten-free'],
        },
      ],
    },
    {
      id: 3,
      name: 'Desserts',
      items: [
        {
          id: 6,
          name: 'Tiramisu',
          description: 'Classic Italian dessert with espresso-soaked ladyfingers',
          price: 9.99,
          available: true,
          dietary: ['vegetarian'],
        },
        {
          id: 7,
          name: 'Chocolate Lava Cake',
          description: 'Warm chocolate cake with molten center, served with vanilla ice cream',
          price: 11.99,
          available: true,
          dietary: ['vegetarian'],
        },
      ],
    },
  ];

  const getDietaryIcon = (dietary: string) => {
    switch (dietary) {
      case 'vegetarian':
        return <Leaf className="h-3 w-3 text-emerald-400" />;
      case 'gluten-free':
      case 'gluten-free-option':
        return <Wheat className="h-3 w-3 text-amber-400" />;
      case 'spicy':
        return <Flame className="h-3 w-3 text-red-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Menu</h1>
          <p className="text-muted-foreground mt-1">
            Manage your menu items, categories, and pricing
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search menu items..."
          className="w-full pl-10 pr-4 py-2 bg-secondary/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-foreground">3</p>
            <p className="text-sm text-muted-foreground">Categories</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-foreground">7</p>
            <p className="text-sm text-muted-foreground">Total Items</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-emerald-400">6</p>
            <p className="text-sm text-muted-foreground">Available</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-muted-foreground">1</p>
            <p className="text-sm text-muted-foreground">Unavailable</p>
          </CardContent>
        </Card>
      </div>

      {/* Menu Categories */}
      <div className="space-y-6">
        {categories.map((category) => (
          <Card key={category.id} className="bg-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  {category.name}
                </CardTitle>
                <CardDescription>{category.items.length} items</CardDescription>
              </div>
              <Button variant="ghost" size="sm">
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {category.items.map((item) => (
                  <div
                    key={item.id}
                    className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg transition-colors ${
                      item.available
                        ? 'bg-secondary/30 hover:bg-secondary/50'
                        : 'bg-muted/30 opacity-60'
                    }`}
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-foreground">{item.name}</p>
                        {item.dietary.map((d) => (
                          <span key={d} className="flex items-center">
                            {getDietaryIcon(d)}
                          </span>
                        ))}
                        {!item.available ? (
                          <Badge variant="secondary" className="text-xs">
                            <EyeOff className="h-3 w-3 mr-1" />
                            Hidden
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>

                    <div className="flex items-center gap-4 ml-0 md:ml-4">
                      <p className="text-lg font-semibold text-foreground flex items-center">
                        <DollarSign className="h-4 w-4" />
                        {item.price.toFixed(2)}
                      </p>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          {item.available ? (
                            <Eye className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
