import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  type EntityType,
  type ServiceCategory,
  type ServiceConfig,
  entityTypeConfig,
  serviceCategoryConfig,
  serviceConfig,
  getServicesForEntityType,
  formatCurrency,
} from '../config';

// ============================================================================
// Entity Type Badge
// ============================================================================

interface EntityTypeBadgeProps {
  entityType: string;
  showIcon?: boolean;
  showFullLabel?: boolean;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function EntityTypeBadge({
  entityType,
  showIcon = false,
  showFullLabel = false,
  size = 'default',
  className,
}: EntityTypeBadgeProps) {
  const config = entityTypeConfig[entityType as EntityType];
  if (!config) {
    return <Badge variant="outline" className={className}>{entityType}</Badge>;
  }

  const Icon = config.icon;
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    default: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };

  return (
    <Badge className={cn(config.bgColor, sizeClasses[size], className)}>
      {showIcon && <Icon className={cn('mr-1', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />}
      {showFullLabel ? config.label : config.shortLabel}
    </Badge>
  );
}

// ============================================================================
// Entity Type Card
// ============================================================================

interface EntityTypeCardProps {
  entityType: EntityType;
  selected?: boolean;
  onSelect?: (entityType: EntityType) => void;
  showServices?: boolean;
  className?: string;
}

export function EntityTypeCard({
  entityType,
  selected = false,
  onSelect,
  showServices = false,
  className,
}: EntityTypeCardProps) {
  const config = entityTypeConfig[entityType];
  const Icon = config.icon;
  const applicableServices = showServices ? getServicesForEntityType(entityType) : [];

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        selected && 'ring-2 ring-primary',
        className
      )}
      onClick={() => onSelect?.(entityType)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn('p-2 rounded-lg', config.bgColor)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold">{config.label}</h4>
            <p className="text-sm text-muted-foreground">{config.description}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {config.requiresGst && (
                <Badge variant="outline" className="text-xs">GST Required</Badge>
              )}
              {config.requiresPan && (
                <Badge variant="outline" className="text-xs">PAN Required</Badge>
              )}
              {config.minDirectors && (
                <Badge variant="outline" className="text-xs">
                  Min {config.minDirectors} Director{config.minDirectors > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            {showServices && applicableServices.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {applicableServices.length} services available
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Service Category Badge
// ============================================================================

interface ServiceCategoryBadgeProps {
  category: ServiceCategory;
  showIcon?: boolean;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function ServiceCategoryBadge({
  category,
  showIcon = true,
  size = 'default',
  className,
}: ServiceCategoryBadgeProps) {
  const config = serviceCategoryConfig[category];
  const Icon = config.icon;
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    default: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };

  return (
    <Badge variant="outline" className={cn(sizeClasses[size], className)}>
      {showIcon && <Icon className={cn('mr-1', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />}
      {config.label}
    </Badge>
  );
}

// ============================================================================
// Service Badge
// ============================================================================

interface ServiceBadgeProps {
  serviceId: string;
  showIcon?: boolean;
  showPrice?: boolean;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function ServiceBadge({
  serviceId,
  showIcon = false,
  showPrice = false,
  size = 'default',
  className,
}: ServiceBadgeProps) {
  const config = serviceConfig.find(s => s.id === serviceId);
  if (!config) {
    return <Badge variant="outline" className={className}>{serviceId}</Badge>;
  }

  const Icon = config.icon;
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    default: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };

  return (
    <Badge variant="outline" className={cn(sizeClasses[size], className)}>
      {showIcon && <Icon className={cn('mr-1', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />}
      {config.label}
      {showPrice && (
        <span className="ml-1 text-muted-foreground">
          ({formatCurrency(config.basePrice)})
        </span>
      )}
    </Badge>
  );
}

// ============================================================================
// Service Card
// ============================================================================

interface ServiceCardProps {
  service: ServiceConfig;
  selected?: boolean;
  onSelect?: (service: ServiceConfig) => void;
  showCategory?: boolean;
  showPrice?: boolean;
  className?: string;
}

export function ServiceCard({
  service,
  selected = false,
  onSelect,
  showCategory = true,
  showPrice = true,
  className,
}: ServiceCardProps) {
  const Icon = service.icon;
  const categoryConfig = serviceCategoryConfig[service.category];

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        selected && 'ring-2 ring-primary',
        className
      )}
      onClick={() => onSelect?.(service)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold">{service.label}</h4>
              {service.isPopular && (
                <Badge className="bg-amber-100 text-amber-800 text-xs">Popular</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{service.description}</p>
            <div className="flex items-center gap-2 mt-2">
              {showCategory && <ServiceCategoryBadge category={service.category} size="sm" />}
              {showPrice && (
                <span className="text-sm font-medium text-emerald-600">
                  Starting {formatCurrency(service.basePrice)}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Service List
// ============================================================================

interface ServiceListProps {
  services?: ServiceConfig[];
  category?: ServiceCategory;
  entityType?: EntityType;
  selectedServiceId?: string;
  onSelect?: (service: ServiceConfig) => void;
  showPrices?: boolean;
  compact?: boolean;
  className?: string;
}

export function ServiceList({
  services,
  category,
  entityType,
  selectedServiceId,
  onSelect,
  showPrices = true,
  compact = false,
  className,
}: ServiceListProps) {
  let filteredServices = services || serviceConfig;

  if (category) {
    filteredServices = filteredServices.filter(s => s.category === category);
  }

  if (entityType) {
    filteredServices = filteredServices.filter(s => s.applicableEntities.includes(entityType));
  }

  if (compact) {
    return (
      <div className={cn('space-y-2', className)}>
        {filteredServices.map(service => {
          const Icon = service.icon;
          const isSelected = selectedServiceId === service.id;

          return (
            <div
              key={service.id}
              className={cn(
                'flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors',
                'hover:bg-muted/50',
                isSelected && 'bg-primary/10 ring-1 ring-primary'
              )}
              onClick={() => onSelect?.(service)}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{service.label}</span>
                {service.isPopular && (
                  <Badge variant="secondary" className="text-xs">Popular</Badge>
                )}
              </div>
              {showPrices && (
                <span className="text-sm text-muted-foreground">
                  {formatCurrency(service.basePrice)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('grid gap-3', className)}>
      {filteredServices.map(service => (
        <ServiceCard
          key={service.id}
          service={service}
          selected={selectedServiceId === service.id}
          onSelect={onSelect}
          showPrice={showPrices}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Popular Services
// ============================================================================

interface PopularServicesProps {
  onSelect?: (service: ServiceConfig) => void;
  selectedServiceId?: string;
  limit?: number;
  className?: string;
}

export function PopularServices({
  onSelect,
  selectedServiceId,
  limit = 5,
  className,
}: PopularServicesProps) {
  const popularServices = serviceConfig.filter(s => s.isPopular).slice(0, limit);

  return (
    <div className={className}>
      <h4 className="text-sm font-semibold mb-3">Popular Services</h4>
      <div className="flex flex-wrap gap-2">
        {popularServices.map(service => {
          const Icon = service.icon;
          const isSelected = selectedServiceId === service.id;

          return (
            <Badge
              key={service.id}
              variant={isSelected ? 'default' : 'outline'}
              className={cn(
                'cursor-pointer transition-colors',
                !isSelected && 'hover:bg-muted'
              )}
              onClick={() => onSelect?.(service)}
            >
              <Icon className="h-3 w-3 mr-1" />
              {service.label}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Entity Type Selection Grid
// ============================================================================

interface EntityTypeSelectionGridProps {
  selectedEntityType?: EntityType;
  onSelect?: (entityType: EntityType) => void;
  showServices?: boolean;
  className?: string;
}

export function EntityTypeSelectionGrid({
  selectedEntityType,
  onSelect,
  showServices = false,
  className,
}: EntityTypeSelectionGridProps) {
  const entityTypes = Object.keys(entityTypeConfig) as EntityType[];

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
      {entityTypes.map(entityType => (
        <EntityTypeCard
          key={entityType}
          entityType={entityType}
          selected={selectedEntityType === entityType}
          onSelect={onSelect}
          showServices={showServices}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Service Category Tabs
// ============================================================================

interface ServiceCategoryTabsProps {
  selectedCategory?: ServiceCategory;
  onSelect?: (category: ServiceCategory) => void;
  className?: string;
}

export function ServiceCategoryTabs({
  selectedCategory,
  onSelect,
  className,
}: ServiceCategoryTabsProps) {
  const categories = Object.keys(serviceCategoryConfig) as ServiceCategory[];

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {categories.map(category => {
        const config = serviceCategoryConfig[category];
        const Icon = config.icon;
        const isSelected = selectedCategory === category;

        return (
          <Badge
            key={category}
            variant={isSelected ? 'default' : 'outline'}
            className={cn(
              'cursor-pointer transition-colors',
              !isSelected && 'hover:bg-muted'
            )}
            onClick={() => onSelect?.(category)}
          >
            <Icon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
        );
      })}
    </div>
  );
}
