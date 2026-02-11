import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Product, ProductCategory } from '@/types/database';
import { useActivityLog } from '@/hooks/useActivityLog';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Search,
  Package,
  Eye,
  Edit,
  Loader2,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Archive,
  FileDigit,
  ArrowUpDown,
  ImageIcon,
  User,
  Tag,
  Boxes,
  FileDown,
} from 'lucide-react';
import { format } from 'date-fns';

// Category configuration
const CATEGORY_CONFIG: Record<ProductCategory, { label: string; color: string }> = {
  spice: { label: 'Spices & Seasonings', color: 'bg-orange-400/10 text-orange-400 border-orange-400/20' },
  sauce: { label: 'Sauces & Condiments', color: 'bg-red-400/10 text-red-400 border-red-400/20' },
  tool: { label: 'Kitchen Tools', color: 'bg-slate-400/10 text-slate-400 border-slate-400/20' },
  book: { label: 'Cookbooks & eBooks', color: 'bg-blue-400/10 text-blue-400 border-blue-400/20' },
  course: { label: 'Online Courses', color: 'bg-purple-400/10 text-purple-400 border-purple-400/20' },
  kit: { label: 'Ingredient Kits', color: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
};

const CATEGORIES: ProductCategory[] = ['spice', 'sauce', 'tool', 'book', 'course', 'kit'];

type SortOption = 'newest' | 'oldest' | 'price_high' | 'price_low';

const ITEMS_PER_PAGE = 10;

export function ProductsPage() {
  const queryClient = useQueryClient();
  const { logActivity } = useActivityLog();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [creatorFilter, setCreatorFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [currentPage, setCurrentPage] = useState(1);

  // Dialog states
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<{
    title: string;
    short_description: string;
    price_cents: number;
  }>({ title: '', short_description: '', price_cents: 0 });

  // Fetch products
  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Table might not exist yet
        console.warn('products table not found:', error.message);
        return [] as Product[];
      }

      return (data ?? []) as Product[];
    },
  });

  // Toggle active status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ product, newStatus }: { product: Product; newStatus: boolean }) => {
      const { error } = await supabase
        .from('products')
        .update({ is_active: newStatus })
        .eq('id', product.id);

      if (error) throw error;
      return { product, newStatus };
    },
    onSuccess: async ({ product, newStatus }) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      const action = newStatus ? 'activate_product' : 'deactivate_product';
      await logActivity(action, 'product', product.id, product.title);
      toast.success(`Product ${newStatus ? 'activated' : 'deactivated'}`);
    },
    onError: (error) => {
      toast.error(`Failed to update product: ${error.message}`);
    },
  });

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async ({ productId, data }: { productId: string; data: Partial<Product> }) => {
      const { error } = await supabase
        .from('products')
        .update(data)
        .eq('id', productId);

      if (error) throw error;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      if (selectedProduct) {
        await logActivity('update_product', 'product', selectedProduct.id, selectedProduct.title);
      }
      toast.success('Product updated successfully');
      setIsEditOpen(false);
      setSelectedProduct(null);
    },
    onError: (error) => {
      toast.error(`Failed to update product: ${error.message}`);
    },
  });

  // Get unique creators for filter
  const uniqueCreators = useMemo(() => {
    if (!products) return [];
    const creatorMap = new Map<string, { id: string; name: string }>();
    products.forEach((product) => {
      if (!creatorMap.has(product.creator_id)) {
        creatorMap.set(product.creator_id, {
          id: product.creator_id,
          name: product.creator_name ?? 'Unknown Creator',
        });
      }
    });
    return Array.from(creatorMap.values());
  }, [products]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    if (!products) return [];

    const filtered = products.filter((product) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery === '' ||
        product.title.toLowerCase().includes(searchLower) ||
        (product.description?.toLowerCase().includes(searchLower) ?? false);

      const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && product.is_active) ||
        (statusFilter === 'inactive' && !product.is_active);
      const matchesCreator = creatorFilter === 'all' || product.creator_id === creatorFilter;

      return matchesSearch && matchesCategory && matchesStatus && matchesCreator;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'price_high':
          return b.price_cents - a.price_cents;
        case 'price_low':
          return a.price_cents - b.price_cents;
        default:
          return 0;
      }
    });

    return filtered;
  }, [products, searchQuery, categoryFilter, statusFilter, creatorFilter, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Stats
  const totalProducts = products?.length ?? 0;
  const activeProducts = products?.filter((p) => p.is_active).length ?? 0;
  const outOfStock = products?.filter((p) => p.inventory_count === 0).length ?? 0;
  const digitalProducts = products?.filter((p) => p.is_digital).length ?? 0;

  // Handlers
  const handleFilterChange = <T,>(setter: React.Dispatch<React.SetStateAction<T>>, value: T) => {
    setter(value);
    setCurrentPage(1);
  };

  const openDetailDialog = (product: Product) => {
    setSelectedProduct(product);
    setIsDetailOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setSelectedProduct(product);
    setEditFormData({
      title: product.title,
      short_description: product.short_description ?? '',
      price_cents: product.price_cents,
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = () => {
    if (!selectedProduct) return;
    updateProductMutation.mutate({
      productId: selectedProduct.id,
      data: {
        title: editFormData.title,
        short_description: editFormData.short_description || null,
        price_cents: editFormData.price_cents,
      },
    });
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Products</h1>
        <p className="text-muted-foreground mt-1">
          Manage creator products sold through the marketplace
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalProducts}</p>
              <p className="text-sm text-muted-foreground">Total Products</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-400/10 flex items-center justify-center">
              <Tag className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{activeProducts}</p>
              <p className="text-sm text-muted-foreground">Active Products</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-amber-400/10 flex items-center justify-center">
              <Archive className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{outOfStock}</p>
              <p className="text-sm text-muted-foreground">Out of Stock</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-400/10 flex items-center justify-center">
              <FileDigit className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{digitalProducts}</p>
              <p className="text-sm text-muted-foreground">Digital Products</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products by title..."
                value={searchQuery}
                onChange={(e) => handleFilterChange(setSearchQuery, e.target.value)}
                className="pl-10 bg-secondary/50"
              />
            </div>

            {/* Filter dropdowns */}
            <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
              {/* Category Filter */}
              <Select
                value={categoryFilter}
                onValueChange={(value: ProductCategory | 'all') =>
                  handleFilterChange(setCategoryFilter, value)
                }
              >
                <SelectTrigger className="w-full sm:w-[180px] bg-secondary/50">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORY_CONFIG[cat].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select
                value={statusFilter}
                onValueChange={(value: 'all' | 'active' | 'inactive') =>
                  handleFilterChange(setStatusFilter, value)
                }
              >
                <SelectTrigger className="w-full sm:w-[140px] bg-secondary/50">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              {/* Creator Filter */}
              <Select
                value={creatorFilter}
                onValueChange={(value) => handleFilterChange(setCreatorFilter, value)}
              >
                <SelectTrigger className="w-full sm:w-[160px] bg-secondary/50">
                  <SelectValue placeholder="All Creators" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Creators</SelectItem>
                  {uniqueCreators.map((creator) => (
                    <SelectItem key={creator.id} value={creator.id}>
                      {creator.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select
                value={sortBy}
                onValueChange={(value: SortOption) => handleFilterChange(setSortBy, value)}
              >
                <SelectTrigger className="w-full sm:w-[160px] bg-secondary/50">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="price_high">Price: High to Low</SelectItem>
                  <SelectItem value="price_low">Price: Low to High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : paginatedProducts.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead className="text-muted-foreground">Product</TableHead>
                      <TableHead className="text-muted-foreground hidden md:table-cell">Creator</TableHead>
                      <TableHead className="text-muted-foreground hidden lg:table-cell">Category</TableHead>
                      <TableHead className="text-muted-foreground">Price</TableHead>
                      <TableHead className="text-muted-foreground hidden md:table-cell">Inventory</TableHead>
                      <TableHead className="text-muted-foreground text-center">Status</TableHead>
                      <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedProducts.map((product) => {
                      const categoryConfig = CATEGORY_CONFIG[product.category];

                      return (
                        <TableRow key={product.id} className="border-border/50">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-lg bg-secondary/50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                {product.images && product.images.length > 0 ? (
                                  <img
                                    src={product.images[0]}
                                    alt={product.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-foreground truncate max-w-[200px]">
                                  {product.title}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  {product.is_digital ? (
                                    <Badge variant="outline" className="text-xs py-0">
                                      <FileDown className="h-3 w-3 mr-1" />
                                      Digital
                                    </Badge>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={product.creator_avatar_url ?? undefined} />
                                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                  {getInitials(product.creator_name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-foreground truncate max-w-[100px]">
                                {product.creator_name ?? 'Unknown'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <Badge variant="outline" className={categoryConfig.color}>
                              {categoryConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-foreground">
                                {formatPrice(product.price_cents)}
                              </span>
                            </div>
                            {product.compare_at_price_cents ? (
                              <span className="text-xs text-muted-foreground line-through">
                                {formatPrice(product.compare_at_price_cents)}
                              </span>
                            ) : null}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex items-center gap-2">
                              <Boxes className="h-4 w-4 text-muted-foreground" />
                              <span
                                className={
                                  product.inventory_count === 0
                                    ? 'text-red-400 font-medium'
                                    : product.inventory_count < 10
                                    ? 'text-amber-400'
                                    : 'text-foreground'
                                }
                              >
                                {product.is_digital ? 'N/A' : product.inventory_count}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={product.is_active}
                              onCheckedChange={(checked) =>
                                toggleStatusMutation.mutate({ product, newStatus: checked })
                              }
                              disabled={toggleStatusMutation.isPending}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDetailDialog(product)}
                                title="View details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(product)}
                                title="Edit product"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 ? (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
                  <p className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)} of{' '}
                    {filteredProducts.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="p-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">No products found</h3>
              <p className="text-muted-foreground">
                {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all' || creatorFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'No products have been created by creators yet'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              Product Details
            </DialogTitle>
            <DialogDescription>View product information</DialogDescription>
          </DialogHeader>

          {selectedProduct ? (
            <div className="space-y-4">
              {/* Image Carousel */}
              {selectedProduct.images && selectedProduct.images.length > 0 ? (
                <div className="px-10">
                  <Carousel className="w-full">
                    <CarouselContent>
                      {selectedProduct.images.map((image, index) => (
                        <CarouselItem key={index}>
                          <div className="aspect-square rounded-lg overflow-hidden bg-secondary/30">
                            <img
                              src={image}
                              alt={`${selectedProduct.title} - Image ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    {selectedProduct.images.length > 1 ? (
                      <>
                        <CarouselPrevious />
                        <CarouselNext />
                      </>
                    ) : null}
                  </Carousel>
                </div>
              ) : (
                <div className="aspect-video rounded-lg bg-secondary/30 flex items-center justify-center">
                  <ImageIcon className="h-16 w-16 text-muted-foreground/50" />
                </div>
              )}

              {/* Title and Status */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={CATEGORY_CONFIG[selectedProduct.category].color}>
                    {CATEGORY_CONFIG[selectedProduct.category].label}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={
                      selectedProduct.is_active
                        ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
                        : 'bg-slate-400/10 text-slate-400 border-slate-400/20'
                    }
                  >
                    {selectedProduct.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  {selectedProduct.is_digital ? (
                    <Badge variant="outline" className="bg-blue-400/10 text-blue-400 border-blue-400/20">
                      <FileDown className="h-3 w-3 mr-1" />
                      Digital
                    </Badge>
                  ) : null}
                </div>
                <h3 className="text-xl font-semibold text-foreground">{selectedProduct.title}</h3>
                {selectedProduct.short_description ? (
                  <p className="text-sm text-muted-foreground mt-1">{selectedProduct.short_description}</p>
                ) : null}
              </div>

              {/* Price */}
              <div className="p-4 rounded-lg bg-secondary/30">
                <p className="text-xs text-muted-foreground mb-1">Price</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-foreground">
                    {formatPrice(selectedProduct.price_cents)}
                  </span>
                  {selectedProduct.compare_at_price_cents ? (
                    <span className="text-lg text-muted-foreground line-through">
                      {formatPrice(selectedProduct.compare_at_price_cents)}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Creator Info */}
              <div className="p-4 rounded-lg bg-secondary/30">
                <p className="text-xs text-muted-foreground mb-2">Creator</p>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedProduct.creator_avatar_url ?? undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(selectedProduct.creator_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">{selectedProduct.creator_name ?? 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{selectedProduct.creator_id.substring(0, 8)}...</p>
                  </div>
                </div>
              </div>

              {/* Inventory */}
              {!selectedProduct.is_digital ? (
                <div className="p-4 rounded-lg bg-secondary/30">
                  <p className="text-xs text-muted-foreground mb-1">Inventory</p>
                  <p
                    className={`text-lg font-semibold ${
                      selectedProduct.inventory_count === 0
                        ? 'text-red-400'
                        : selectedProduct.inventory_count < 10
                        ? 'text-amber-400'
                        : 'text-foreground'
                    }`}
                  >
                    {selectedProduct.inventory_count} units
                    {selectedProduct.inventory_count === 0 ? ' - Out of Stock' : ''}
                  </p>
                </div>
              ) : null}

              {/* Digital Product Info */}
              {selectedProduct.is_digital && selectedProduct.digital_file_name ? (
                <div className="p-4 rounded-lg bg-secondary/30">
                  <p className="text-xs text-muted-foreground mb-1">Digital File</p>
                  <p className="text-sm font-medium text-foreground">{selectedProduct.digital_file_name}</p>
                </div>
              ) : null}

              {/* Description */}
              {selectedProduct.description ? (
                <div className="p-4 rounded-lg bg-secondary/30">
                  <p className="text-xs text-muted-foreground mb-2">Description</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{selectedProduct.description}</p>
                </div>
              ) : null}

              {/* Created Date */}
              <p className="text-xs text-muted-foreground">
                Created: {format(new Date(selectedProduct.created_at), 'MMM d, yyyy h:mm a')}
              </p>

              {/* Toggle Status */}
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <span className="text-sm text-muted-foreground">Product Status</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground">
                    {selectedProduct.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <Switch
                    checked={selectedProduct.is_active}
                    onCheckedChange={(checked) => {
                      toggleStatusMutation.mutate({ product: selectedProduct, newStatus: checked });
                      setSelectedProduct({ ...selectedProduct, is_active: checked });
                    }}
                    disabled={toggleStatusMutation.isPending}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-muted-foreground" />
              Edit Product
            </DialogTitle>
            <DialogDescription>
              Update basic product information. Note: Products are created by creators, admins can only moderate.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editFormData.title}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, title: e.target.value }))}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="edit-short-description">Short Description</Label>
              <Textarea
                id="edit-short-description"
                value={editFormData.short_description}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, short_description: e.target.value }))}
                placeholder="Brief product description..."
                rows={2}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="edit-price">Price (in cents)</Label>
              <Input
                id="edit-price"
                type="number"
                value={editFormData.price_cents}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, price_cents: parseInt(e.target.value) || 0 }))}
                min={0}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Display: {formatPrice(editFormData.price_cents)}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={updateProductMutation.isPending || !editFormData.title.trim()}
            >
              {updateProductMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
