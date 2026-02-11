import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  Building2,
  Eye,
  ExternalLink,
  CheckCircle,
  Clock,
  MapPin,
  Mail,
  Phone,
  Calendar,
  User,
  Store,
  Coffee,
  Tractor,
  ShoppingBag,
  Truck,
  UtensilsCrossed,
  Plus,
  ShieldCheck,
  XCircle,
  Loader2,
  Power,
  ToggleLeft,
  ToggleRight,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const baseUrl = import.meta.env.VITE_BACKEND_URL;

// Business type options
const businessTypes = [
  { value: 'restaurant', label: 'Restaurant', icon: UtensilsCrossed },
  { value: 'cafe', label: 'Cafe', icon: Coffee },
  { value: 'farm', label: 'Farm', icon: Tractor },
  { value: 'farmstand', label: 'Farm Stand', icon: Store },
  { value: 'farmers_market', label: 'Farmers Market', icon: ShoppingBag },
  { value: 'food_producer', label: 'Food Producer', icon: Building2 },
  { value: 'food_store', label: 'Food Store', icon: Store },
  { value: 'catering', label: 'Catering', icon: UtensilsCrossed },
  { value: 'food_truck', label: 'Food Truck', icon: Truck },
];

interface Business {
  id: string;
  businessName: string;
  businessType: string;
  slug: string;
  logoUrl: string | null;
  city: string | null;
  state: string | null;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  owner?: {
    id: string;
    email: string;
    name: string | null;
  };
}

interface BusinessDetails extends Business {
  email?: string;
  phone?: string | null;
  description?: string | null;
  addressLine1?: string | null;
  websiteUrl?: string | null;
  brandColor?: string;
  hours?: Array<{
    dayOfWeek: number;
    openTime: string | null;
    closeTime: string | null;
    isClosed: boolean;
  }>;
}

interface RelatedCounts {
  menuCategories: number;
  menuItems: number;
  orders: number;
  customers: number;
  reservations: number;
  teamMembers: number;
}

type TypeFilter = 'all' | string;

export function BusinessesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessDetails | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Verification states
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active status states
  const [isToggleActiveDialogOpen, setIsToggleActiveDialogOpen] = useState(false);
  const [toggleActiveReason, setToggleActiveReason] = useState('');

  // Delete business states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [businessToDelete, setBusinessToDelete] = useState<Business | null>(null);
  const [deleteType, setDeleteType] = useState<'archive' | 'permanent'>('archive');
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [relatedCounts, setRelatedCounts] = useState<RelatedCounts | null>(null);
  const [isLoadingRelatedCounts, setIsLoadingRelatedCounts] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: businesses, isLoading } = useQuery({
    queryKey: ['businesses', typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (typeFilter !== 'all') {
        params.set('type', typeFilter);
      }
      const url = `${baseUrl}/api/business${params.toString() ? `?${params}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch businesses');
      const json = await res.json();
      return json.data as Business[];
    },
  });

  const openBusinessDetail = async (business: Business) => {
    setIsLoadingDetails(true);
    setIsDetailOpen(true);

    try {
      const res = await fetch(`${baseUrl}/api/business/${business.id}`);
      if (!res.ok) throw new Error('Failed to fetch business details');
      const json = await res.json();
      setSelectedBusiness(json.data as BusinessDetails);
    } catch (error) {
      // Fallback to basic business info
      setSelectedBusiness(business);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleVerifyBusiness = async () => {
    if (!selectedBusiness || !user?.id) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${baseUrl}/api/business/${selectedBusiness.id}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: user.id,
          notes: verificationNotes || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to verify business');
      }

      const json = await res.json();
      setSelectedBusiness({ ...selectedBusiness, ...json.data, isVerified: true });
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      setIsVerifyDialogOpen(false);
      setVerificationNotes('');
      toast.success(`${selectedBusiness.businessName} has been verified`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to verify business');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectBusiness = async () => {
    if (!selectedBusiness || !user?.id || !rejectionReason.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${baseUrl}/api/business/${selectedBusiness.id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: user.id,
          reason: rejectionReason,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to reject business');
      }

      const json = await res.json();
      setSelectedBusiness({ ...selectedBusiness, ...json.data, isVerified: false });
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      setIsRejectDialogOpen(false);
      setRejectionReason('');
      toast.success(`${selectedBusiness.businessName} verification has been rejected`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reject business');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async () => {
    if (!selectedBusiness || !user?.id) return;

    const newActiveState = !selectedBusiness.isActive;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${baseUrl}/api/business/${selectedBusiness.id}/toggle-active`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: user.id,
          isActive: newActiveState,
          reason: toggleActiveReason || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to update business status');
      }

      const json = await res.json();
      setSelectedBusiness({ ...selectedBusiness, ...json.data, isActive: newActiveState });
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      setIsToggleActiveDialogOpen(false);
      setToggleActiveReason('');
      toast.success(`${selectedBusiness.businessName} has been ${newActiveState ? 'activated' : 'deactivated'}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update business status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteDialog = async (business: Business) => {
    setBusinessToDelete(business);
    setDeleteType('archive');
    setDeleteConfirmName('');
    setDeleteReason('');
    setRelatedCounts(null);
    setIsDeleteDialogOpen(true);
    setIsLoadingRelatedCounts(true);

    try {
      const res = await fetch(`${baseUrl}/api/business/${business.id}/related-counts`);
      if (res.ok) {
        const json = await res.json();
        setRelatedCounts(json.data);
      }
    } catch (error) {
      // Silently fail - counts are informational only
    } finally {
      setIsLoadingRelatedCounts(false);
    }
  };

  const handleDeleteBusiness = async () => {
    if (!businessToDelete || !user?.id) return;
    if (deleteType === 'permanent' && deleteConfirmName !== businessToDelete.businessName) return;

    setIsDeleting(true);
    try {
      const url = deleteType === 'permanent'
        ? `${baseUrl}/api/business/${businessToDelete.id}?hard=true`
        : `${baseUrl}/api/business/${businessToDelete.id}`;

      const res = await fetch(url, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: user.id,
          reason: deleteReason || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to delete business');
      }

      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      setIsDeleteDialogOpen(false);
      setBusinessToDelete(null);

      // Close details dialog if it was showing the deleted business
      if (selectedBusiness?.id === businessToDelete.id) {
        setIsDetailOpen(false);
        setSelectedBusiness(null);
      }

      toast.success(
        deleteType === 'permanent'
          ? `${businessToDelete.businessName} has been permanently deleted`
          : `${businessToDelete.businessName} has been archived`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete business');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredBusinesses = businesses?.filter((business) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      business.businessName.toLowerCase().includes(searchLower) ||
      (business.city?.toLowerCase().includes(searchLower) ?? false) ||
      (business.owner?.email?.toLowerCase().includes(searchLower) ?? false);

    return matchesSearch;
  });

  const getBusinessTypeInfo = (type: string) => {
    const found = businessTypes.find((t) => t.value === type);
    return found ?? { value: type, label: type, icon: Building2 };
  };

  const formatBusinessType = (type: string) => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getDayName = (day: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day];
  };

  // Stats
  const totalBusinesses = businesses?.length ?? 0;
  const activeBusinesses = businesses?.filter((b) => b.isActive).length ?? 0;
  const verifiedBusinesses = businesses?.filter((b) => b.isVerified).length ?? 0;
  const pendingVerification = businesses?.filter((b) => !b.isVerified).length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Businesses</h1>
          <p className="text-muted-foreground mt-1">
            Manage registered commercial businesses
          </p>
        </div>
        <Link to="/business/register">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Register New Business
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-400/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalBusinesses}</p>
              <p className="text-sm text-muted-foreground">Total Businesses</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-400/10 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{activeBusinesses}</p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-amber-400/10 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{verifiedBusinesses}</p>
              <p className="text-sm text-muted-foreground">Verified</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-orange-400/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{pendingVerification}</p>
              <p className="text-sm text-muted-foreground">Pending Verification</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, city, or owner email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary/50"
              />
            </div>
            <Select value={typeFilter} onValueChange={(value: TypeFilter) => setTypeFilter(value)}>
              <SelectTrigger className="w-full sm:w-[180px] bg-secondary/50">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {businessTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Businesses Table */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredBusinesses && filteredBusinesses.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead className="text-muted-foreground">Business</TableHead>
                    <TableHead className="text-muted-foreground hidden md:table-cell">Type</TableHead>
                    <TableHead className="text-muted-foreground hidden md:table-cell">Status</TableHead>
                    <TableHead className="text-muted-foreground hidden lg:table-cell">Owner Email</TableHead>
                    <TableHead className="text-muted-foreground hidden lg:table-cell">Created</TableHead>
                    <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBusinesses.map((business) => {
                    const typeInfo = getBusinessTypeInfo(business.businessType);
                    const TypeIcon = typeInfo.icon;

                    return (
                      <TableRow
                        key={business.id}
                        className={`border-border/50 ${!business.isActive ? 'opacity-60' : ''}`}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              {business.logoUrl ? (
                                <img
                                  src={business.logoUrl}
                                  alt={business.businessName}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                <TypeIcon className="h-5 w-5 text-primary" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-foreground truncate max-w-[200px]">
                                  {business.businessName}
                                </p>
                                {business.isVerified ? (
                                  <Badge variant="outline" className="bg-emerald-400/10 text-emerald-400 border-emerald-400/20 text-xs">
                                    Verified
                                  </Badge>
                                ) : null}
                              </div>
                              {business.city || business.state ? (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {[business.city, business.state].filter(Boolean).join(', ')}
                                </p>
                              ) : (
                                <p className="text-xs text-muted-foreground">{business.slug}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="secondary" className="bg-secondary/50">
                            {formatBusinessType(business.businessType)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {business.isActive ? (
                            <Badge variant="outline" className="bg-emerald-400/10 text-emerald-400 border-emerald-400/20">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-400/10 text-gray-400 border-gray-400/20">
                              <Clock className="h-3 w-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {business.owner?.email ?? '-'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {format(new Date(business.createdAt), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openBusinessDetail(business)}
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Link to="/business">
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Open Console"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteDialog(business)}
                              title="Delete business"
                              className="text-red-400 hover:text-red-500 hover:bg-red-400/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">No businesses found</h3>
              <p className="text-muted-foreground">
                {searchQuery || typeFilter !== 'all'
                  ? 'Try adjusting your search or filter'
                  : 'No businesses have registered yet'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Business Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Business Details</DialogTitle>
            <DialogDescription>View business profile information</DialogDescription>
          </DialogHeader>

          {isLoadingDetails ? (
            <div className="space-y-4 p-1">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : selectedBusiness ? (
            <div className="space-y-6 overflow-y-auto flex-1 pr-2">
              {/* Business Header */}
              <div className="flex items-start gap-4">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: selectedBusiness.brandColor
                      ? `${selectedBusiness.brandColor}20`
                      : 'var(--primary-10)'
                  }}
                >
                  {selectedBusiness.logoUrl ? (
                    <img
                      src={selectedBusiness.logoUrl}
                      alt={selectedBusiness.businessName}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    <Building2
                      className="h-8 w-8"
                      style={{ color: selectedBusiness.brandColor ?? 'var(--primary)' }}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-semibold text-foreground">
                      {selectedBusiness.businessName}
                    </h3>
                    {selectedBusiness.isVerified ? (
                      <Badge className="bg-emerald-400/10 text-emerald-400 border-emerald-400/20">
                        Verified
                      </Badge>
                    ) : null}
                    {selectedBusiness.isActive ? (
                      <Badge variant="outline" className="bg-emerald-400/10 text-emerald-400 border-emerald-400/20">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-400/10 text-gray-400 border-gray-400/20">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <Badge variant="secondary" className="mt-1">
                    {formatBusinessType(selectedBusiness.businessType)}
                  </Badge>
                </div>
              </div>

              {/* Description */}
              {selectedBusiness.description ? (
                <p className="text-muted-foreground text-sm">{selectedBusiness.description}</p>
              ) : null}

              {/* Contact Info */}
              <div className="space-y-3">
                <h4 className="font-medium text-foreground text-sm">Contact Information</h4>
                <div className="grid gap-2">
                  {selectedBusiness.owner ? (
                    <div className="flex items-center gap-3 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Owner:</span>
                      <span className="text-foreground">
                        {selectedBusiness.owner.name ?? selectedBusiness.owner.email}
                      </span>
                    </div>
                  ) : null}
                  {selectedBusiness.owner?.email ? (
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={`mailto:${selectedBusiness.owner.email}`}
                        className="text-primary hover:underline"
                      >
                        {selectedBusiness.owner.email}
                      </a>
                    </div>
                  ) : null}
                  {selectedBusiness.phone ? (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">{selectedBusiness.phone}</span>
                    </div>
                  ) : null}
                  {(selectedBusiness.city || selectedBusiness.state || selectedBusiness.addressLine1) ? (
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">
                        {[
                          selectedBusiness.addressLine1,
                          selectedBusiness.city,
                          selectedBusiness.state
                        ].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Registered:</span>
                    <span className="text-foreground">
                      {format(new Date(selectedBusiness.createdAt), 'MMMM d, yyyy')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Business Hours */}
              {selectedBusiness.hours && selectedBusiness.hours.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="font-medium text-foreground text-sm">Business Hours</h4>
                  <div className="grid gap-1 text-sm">
                    {selectedBusiness.hours
                      .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                      .map((hour) => (
                        <div key={hour.dayOfWeek} className="flex items-center justify-between py-1">
                          <span className="text-muted-foreground">{getDayName(hour.dayOfWeek)}</span>
                          <span className="text-foreground">
                            {hour.isClosed ? (
                              'Closed'
                            ) : (
                              `${hour.openTime} - ${hour.closeTime}`
                            )}
                          </span>
                        </div>
                      ))
                    }
                  </div>
                </div>
              ) : null}

              {/* Business ID */}
              <div className="p-3 rounded-lg bg-secondary/30">
                <p className="text-xs text-muted-foreground mb-1">Business ID</p>
                <p className="text-xs font-mono text-foreground break-all">{selectedBusiness.id}</p>
              </div>

              {/* Verification Actions */}
              <div className="space-y-3">
                <h4 className="font-medium text-foreground text-sm">Verification Status</h4>
                {selectedBusiness.isVerified ? (
                  <div className="p-3 rounded-lg bg-emerald-400/10 border border-emerald-400/20">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <ShieldCheck className="h-5 w-5" />
                      <span className="font-medium">Verified Business</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      This business has been verified by an administrator.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 text-orange-400 border-orange-400/30 hover:bg-orange-400/10"
                      onClick={() => setIsRejectDialogOpen(true)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Revoke Verification
                    </Button>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-orange-400/10 border border-orange-400/20">
                    <div className="flex items-center gap-2 text-orange-400">
                      <Clock className="h-5 w-5" />
                      <span className="font-medium">Pending Verification</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      This business is awaiting verification approval.
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => setIsVerifyDialogOpen(true)}
                      >
                        <ShieldCheck className="h-4 w-4 mr-2" />
                        Verify Business
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-400 border-red-400/30 hover:bg-red-400/10"
                        onClick={() => setIsRejectDialogOpen(true)}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Active Status */}
              <div className="space-y-3">
                <h4 className="font-medium text-foreground text-sm">Active Status</h4>
                {selectedBusiness.isActive ? (
                  <div className="p-3 rounded-lg bg-emerald-400/10 border border-emerald-400/20">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <ToggleRight className="h-5 w-5" />
                      <span className="font-medium">Active</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      This business is visible to customers on the platform.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 text-orange-400 border-orange-400/30 hover:bg-orange-400/10"
                      onClick={() => setIsToggleActiveDialogOpen(true)}
                    >
                      <Power className="h-4 w-4 mr-2" />
                      Deactivate Business
                    </Button>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-gray-400/10 border border-gray-400/20">
                    <div className="flex items-center gap-2 text-gray-400">
                      <ToggleLeft className="h-5 w-5" />
                      <span className="font-medium">Inactive</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      This business is hidden from customers on the platform.
                    </p>
                    <Button
                      size="sm"
                      className="mt-3 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => setIsToggleActiveDialogOpen(true)}
                    >
                      <Power className="h-4 w-4 mr-2" />
                      Activate Business
                    </Button>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Link to={`/business?businessId=${selectedBusiness.id}`} className="flex-1">
                  <Button className="w-full">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Business Console
                  </Button>
                </Link>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Verify Business Dialog */}
      <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              Verify Business
            </DialogTitle>
            <DialogDescription>
              Verify {selectedBusiness?.businessName} as a trusted business on the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Admin Notes (optional)
              </label>
              <Textarea
                placeholder="Add any notes about this verification decision..."
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                className="bg-secondary/50"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsVerifyDialogOpen(false);
                setVerificationNotes('');
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleVerifyBusiness}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Verify Business
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Business Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-400" />
              {selectedBusiness?.isVerified ? 'Revoke Verification' : 'Reject Verification'}
            </DialogTitle>
            <DialogDescription>
              {selectedBusiness?.isVerified
                ? `Remove the verified status from ${selectedBusiness?.businessName}.`
                : `Reject the verification request for ${selectedBusiness?.businessName}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Reason <span className="text-red-400">*</span>
              </label>
              <Textarea
                placeholder="Explain why this verification is being rejected..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="bg-secondary/50"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                This reason will be recorded in the activity log.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRejectDialogOpen(false);
                setRejectionReason('');
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectBusiness}
              disabled={isSubmitting || !rejectionReason.trim()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  {selectedBusiness?.isVerified ? 'Revoke Verification' : 'Reject'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toggle Active Dialog */}
      <Dialog open={isToggleActiveDialogOpen} onOpenChange={setIsToggleActiveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Power className={`h-5 w-5 ${selectedBusiness?.isActive ? 'text-orange-400' : 'text-emerald-400'}`} />
              {selectedBusiness?.isActive ? 'Deactivate Business' : 'Activate Business'}
            </DialogTitle>
            <DialogDescription>
              {selectedBusiness?.isActive
                ? `Deactivate ${selectedBusiness?.businessName}. This will hide it from customers on the platform.`
                : `Activate ${selectedBusiness?.businessName}. This will make it visible to customers on the platform.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Reason (optional)
              </label>
              <Textarea
                placeholder={selectedBusiness?.isActive
                  ? "Why is this business being deactivated..."
                  : "Notes about activating this business..."}
                value={toggleActiveReason}
                onChange={(e) => setToggleActiveReason(e.target.value)}
                className="bg-secondary/50"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                This will be recorded in the activity log.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsToggleActiveDialogOpen(false);
                setToggleActiveReason('');
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              className={selectedBusiness?.isActive
                ? 'bg-orange-600 hover:bg-orange-700'
                : 'bg-emerald-600 hover:bg-emerald-700'}
              onClick={handleToggleActive}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Power className="h-4 w-4 mr-2" />
                  {selectedBusiness?.isActive ? 'Deactivate' : 'Activate'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Business Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsDeleteDialogOpen(false);
          setBusinessToDelete(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Trash2 className="h-5 w-5" />
              Delete Business
            </DialogTitle>
            <DialogDescription>
              You are about to delete this business. This action may be irreversible.
            </DialogDescription>
          </DialogHeader>

          {businessToDelete ? (
            <div className="space-y-4 py-4">
              {/* Business Name */}
              <div className="p-3 rounded-lg bg-red-400/10 border border-red-400/20">
                <p className="text-sm text-muted-foreground">Business to delete:</p>
                <p className="text-lg font-semibold text-foreground">{businessToDelete.businessName}</p>
                <p className="text-xs text-muted-foreground mt-1">ID: {businessToDelete.id}</p>
              </div>

              {/* Related Data Counts */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Related data that will be affected:</p>
                {isLoadingRelatedCounts ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading related data...
                  </div>
                ) : relatedCounts ? (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {relatedCounts.menuCategories > 0 ? (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Menu Categories:</span>
                        <span className="text-foreground font-medium">{relatedCounts.menuCategories}</span>
                      </div>
                    ) : null}
                    {relatedCounts.menuItems > 0 ? (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Menu Items:</span>
                        <span className="text-foreground font-medium">{relatedCounts.menuItems}</span>
                      </div>
                    ) : null}
                    {relatedCounts.orders > 0 ? (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Orders:</span>
                        <span className="text-foreground font-medium">{relatedCounts.orders}</span>
                      </div>
                    ) : null}
                    {relatedCounts.customers > 0 ? (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Customers:</span>
                        <span className="text-foreground font-medium">{relatedCounts.customers}</span>
                      </div>
                    ) : null}
                    {relatedCounts.reservations > 0 ? (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Reservations:</span>
                        <span className="text-foreground font-medium">{relatedCounts.reservations}</span>
                      </div>
                    ) : null}
                    {relatedCounts.teamMembers > 0 ? (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Team Members:</span>
                        <span className="text-foreground font-medium">{relatedCounts.teamMembers}</span>
                      </div>
                    ) : null}
                    {Object.values(relatedCounts).every(v => v === 0) ? (
                      <p className="col-span-2 text-muted-foreground">No related data found.</p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Could not load related data counts.</p>
                )}
              </div>

              {/* Delete Type Selection */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Delete method:</p>
                <RadioGroup
                  value={deleteType}
                  onValueChange={(value: 'archive' | 'permanent') => {
                    setDeleteType(value);
                    setDeleteConfirmName('');
                  }}
                  className="space-y-2"
                >
                  <div className="flex items-start space-x-3 p-3 rounded-lg border border-border/50 bg-secondary/30">
                    <RadioGroupItem value="archive" id="archive" className="mt-0.5" />
                    <Label htmlFor="archive" className="cursor-pointer flex-1">
                      <span className="font-medium text-foreground">Archive (Soft Delete)</span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Mark the business as deleted but keep the data. Can be restored later.
                      </p>
                    </Label>
                  </div>
                  <div className="flex items-start space-x-3 p-3 rounded-lg border border-red-400/30 bg-red-400/5">
                    <RadioGroupItem value="permanent" id="permanent" className="mt-0.5 border-red-400 text-red-400" />
                    <Label htmlFor="permanent" className="cursor-pointer flex-1">
                      <span className="font-medium text-red-400">Permanently Delete</span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Remove the business and all related data forever. This cannot be undone.
                      </p>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Confirmation for permanent delete */}
              {deleteType === 'permanent' ? (
                <Alert variant="destructive" className="bg-red-400/10 border-red-400/30">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    <p className="font-medium mb-2">This action is irreversible!</p>
                    <p className="mb-3">
                      Type <span className="font-mono font-bold">"{businessToDelete.businessName}"</span> to confirm:
                    </p>
                    <Input
                      value={deleteConfirmName}
                      onChange={(e) => setDeleteConfirmName(e.target.value)}
                      placeholder="Type business name to confirm"
                      className="bg-background/50"
                    />
                  </AlertDescription>
                </Alert>
              ) : null}

              {/* Optional Reason */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Reason (optional)
                </label>
                <Textarea
                  placeholder="Why is this business being deleted..."
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="bg-secondary/50"
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  This will be recorded in the activity log.
                </p>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setBusinessToDelete(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteBusiness}
              disabled={
                isDeleting ||
                (deleteType === 'permanent' && deleteConfirmName !== businessToDelete?.businessName)
              }
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {deleteType === 'permanent' ? 'Deleting...' : 'Archiving...'}
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {deleteType === 'permanent' ? 'Permanently Delete' : 'Archive Business'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
