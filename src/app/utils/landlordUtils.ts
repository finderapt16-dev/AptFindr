// ── Real Analytics Tracking ──────────────────────────────────────────────────
export interface ApartmentViewTracker {
  apartmentId: string;
  viewerId: string;
  viewerName: string;
  viewerRole: "student" | "employee";
  timestamp: string;
  duration: number; // seconds
}

export interface ApartmentFavoriteTracker {
  apartmentId: string;
  favoriterId: string;
  favoriterName: string;
  favoriterRole: "student" | "employee";
  timestamp: string;
}

export interface MaintenanceRequest {
  id: string;
  apartmentId: string;
  tenantId: string;
  tenantName: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in-progress" | "completed" | "cancelled";
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  landlordNotes?: string;
}

export interface LandlordMessage {
  id: string;
  apartmentId: string;
  senderId: string;
  senderName: string;
  senderRole: "landlord" | "student" | "employee";
  receiverId: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  attachments?: string[];
}

export interface TenantRecord {
  id: string;
  apartmentId: string;
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  moveInDate: string;
  moveOutDate?: string;
  leaseEndDate: string;
  status: "active" | "inactive";
  depositAmount: number;
  rentAmount: number;
  leaseDocument?: string;
}

// ── View Tracking Functions ──────────────────────────────────────────────────

export function trackApartmentView(
  apartmentId: string,
  viewerId: string,
  viewerName: string,
  viewerRole: "student" | "employee",
  duration: number = 0
): void {
  const views = JSON.parse(localStorage.getItem("apartmentViews") || "[]");
  const view: ApartmentViewTracker = {
    apartmentId,
    viewerId,
    viewerName,
    viewerRole,
    timestamp: new Date().toISOString(),
    duration,
  };
  views.push(view);
  localStorage.setItem("apartmentViews", JSON.stringify(views));
}

export function getApartmentViews(apartmentId: string): ApartmentViewTracker[] {
  const views = JSON.parse(localStorage.getItem("apartmentViews") || "[]");
  return views.filter((v: ApartmentViewTracker) => v.apartmentId === apartmentId);
}

export function getViewersForApartment(
  apartmentId: string
): { name: string; date: string; role: string }[] {
  const views = getApartmentViews(apartmentId);
  const uniqueViewers = new Map<string, ApartmentViewTracker>();
  views.forEach((v) => {
    if (!uniqueViewers.has(v.viewerId) || new Date(v.timestamp) > new Date(uniqueViewers.get(v.viewerId)!.timestamp)) {
      uniqueViewers.set(v.viewerId, v);
    }
  });
  return Array.from(uniqueViewers.values()).map((v) => ({
    name: v.viewerName,
    date: new Date(v.timestamp).toLocaleDateString(),
    role: v.viewerRole,
  }));
}

export function getViewCountForApartment(apartmentId: string): number {
  return getApartmentViews(apartmentId).length;
}

// ── Favorite Tracking Functions ──────────────────────────────────────────────

export function trackApartmentFavorite(
  apartmentId: string,
  favoriterId: string,
  favoriterName: string,
  favoriterRole: "student" | "employee"
): void {
  const favorites = JSON.parse(localStorage.getItem("apartmentFavorites") || "[]");
  const exists = favorites.some(
    (f: ApartmentFavoriteTracker) => f.apartmentId === apartmentId && f.favoriterId === favoriterId
  );
  if (!exists) {
    const favorite: ApartmentFavoriteTracker = {
      apartmentId,
      favoriterId,
      favoriterName,
      favoriterRole,
      timestamp: new Date().toISOString(),
    };
    favorites.push(favorite);
    localStorage.setItem("apartmentFavorites", JSON.stringify(favorites));
  }
}

export function removeFavorite(apartmentId: string, favoriterId: string): void {
  const favorites = JSON.parse(localStorage.getItem("apartmentFavorites") || "[]");
  const filtered = favorites.filter(
    (f: ApartmentFavoriteTracker) => !(f.apartmentId === apartmentId && f.favoriterId === favoriterId)
  );
  localStorage.setItem("apartmentFavorites", JSON.stringify(filtered));
}

export function getFavoritesForApartment(
  apartmentId: string
): { name: string; date: string; role: string }[] {
  const favorites = JSON.parse(localStorage.getItem("apartmentFavorites") || "[]");
  return favorites
    .filter((f: ApartmentFavoriteTracker) => f.apartmentId === apartmentId)
    .map((f: ApartmentFavoriteTracker) => ({
      name: f.favoriterName,
      date: new Date(f.timestamp).toLocaleDateString(),
      role: f.favoriterRole,
    }));
}

export function getFavoriteCountForApartment(apartmentId: string): number {
  const favorites = JSON.parse(localStorage.getItem("apartmentFavorites") || "[]");
  return favorites.filter((f: ApartmentFavoriteTracker) => f.apartmentId === apartmentId).length;
}

// ── Maintenance Request Functions ────────────────────────────────────────────

export function createMaintenanceRequest(
  apartmentId: string,
  tenantId: string,
  tenantName: string,
  title: string,
  description: string,
  priority: "low" | "medium" | "high" | "urgent" = "medium"
): MaintenanceRequest {
  const request: MaintenanceRequest = {
    id: `maint_${Date.now()}`,
    apartmentId,
    tenantId,
    tenantName,
    title,
    description,
    priority,
    status: "open",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const requests = JSON.parse(localStorage.getItem("maintenanceRequests") || "[]");
  requests.push(request);
  localStorage.setItem("maintenanceRequests", JSON.stringify(requests));
  return request;
}

export function getMaintenanceRequests(apartmentId?: string): MaintenanceRequest[] {
  const requests = JSON.parse(localStorage.getItem("maintenanceRequests") || "[]");
  return apartmentId ? requests.filter((r: MaintenanceRequest) => r.apartmentId === apartmentId) : requests;
}

export function updateMaintenanceRequestStatus(
  requestId: string,
  status: "open" | "in-progress" | "completed" | "cancelled",
  notes?: string
): void {
  const requests = JSON.parse(localStorage.getItem("maintenanceRequests") || "[]");
  const request = requests.find((r: MaintenanceRequest) => r.id === requestId);
  if (request) {
    request.status = status;
    request.updatedAt = new Date().toISOString();
    if (status === "completed") {
      request.completedAt = new Date().toISOString();
    }
    if (notes) {
      request.landlordNotes = notes;
    }
    localStorage.setItem("maintenanceRequests", JSON.stringify(requests));
  }
}

// ── Messaging Functions ──────────────────────────────────────────────────────

export function sendMessage(
  apartmentId: string,
  senderId: string,
  senderName: string,
  senderRole: "landlord" | "student" | "employee",
  receiverId: string,
  content: string
): LandlordMessage {
  const message: LandlordMessage = {
    id: `msg_${Date.now()}`,
    apartmentId,
    senderId,
    senderName,
    senderRole,
    receiverId,
    content,
    timestamp: new Date().toISOString(),
    isRead: false,
  };
  const messages = JSON.parse(localStorage.getItem("landlordMessages") || "[]");
  messages.push(message);
  localStorage.setItem("landlordMessages", JSON.stringify(messages));
  return message;
}

export function getConversation(apartmentId: string, userId1: string, userId2: string): LandlordMessage[] {
  const messages = JSON.parse(localStorage.getItem("landlordMessages") || "[]");
  return messages
    .filter(
      (m: LandlordMessage) =>
        m.apartmentId === apartmentId &&
        ((m.senderId === userId1 && m.receiverId === userId2) || (m.senderId === userId2 && m.receiverId === userId1))
    )
    .sort((a: LandlordMessage, b: LandlordMessage) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export function markMessageAsRead(messageId: string): void {
  const messages = JSON.parse(localStorage.getItem("landlordMessages") || "[]");
  const message = messages.find((m: LandlordMessage) => m.id === messageId);
  if (message) {
    message.isRead = true;
    localStorage.setItem("landlordMessages", JSON.stringify(messages));
  }
}

export function getUnreadMessages(userId: string): LandlordMessage[] {
  const messages = JSON.parse(localStorage.getItem("landlordMessages") || "[]");
  return messages.filter((m: LandlordMessage) => m.receiverId === userId && !m.isRead);
}

// ── Tenant Management Functions ──────────────────────────────────────────────

export function addTenant(
  apartmentId: string,
  tenantName: string,
  tenantEmail: string,
  tenantPhone: string,
  moveInDate: string,
  leaseEndDate: string,
  depositAmount: number,
  rentAmount: number
): TenantRecord {
  const tenant: TenantRecord = {
    id: `tenant_${Date.now()}`,
    apartmentId,
    tenantName,
    tenantEmail,
    tenantPhone,
    moveInDate,
    leaseEndDate,
    status: "active",
    depositAmount,
    rentAmount,
  };
  const tenants = JSON.parse(localStorage.getItem("tenantRecords") || "[]");
  tenants.push(tenant);
  localStorage.setItem("tenantRecords", JSON.stringify(tenants));
  return tenant;
}

export function getTenantsForApartment(apartmentId: string): TenantRecord[] {
  const tenants = JSON.parse(localStorage.getItem("tenantRecords") || "[]");
  return tenants.filter((t: TenantRecord) => t.apartmentId === apartmentId);
}

export function updateTenantStatus(tenantId: string, status: "active" | "inactive", moveOutDate?: string): void {
  const tenants = JSON.parse(localStorage.getItem("tenantRecords") || "[]");
  const tenant = tenants.find((t: TenantRecord) => t.id === tenantId);
  if (tenant) {
    tenant.status = status;
    if (moveOutDate) {
      tenant.moveOutDate = moveOutDate;
    }
    localStorage.setItem("tenantRecords", JSON.stringify(tenants));
  }
}

// ── Apartment Deletion ───────────────────────────────────────────────────────

export function deleteApartment(apartmentId: string): void {
  const apartments = JSON.parse(localStorage.getItem("customApartments") || "[]");
  const filtered = apartments.filter((a: any) => a.id !== apartmentId);
  localStorage.setItem("customApartments", JSON.stringify(filtered));
  
  // Cleanup related data
  const views = JSON.parse(localStorage.getItem("apartmentViews") || "[]");
  localStorage.setItem("apartmentViews", JSON.stringify(views.filter((v: ApartmentViewTracker) => v.apartmentId !== apartmentId)));
  
  const favorites = JSON.parse(localStorage.getItem("apartmentFavorites") || "[]");
  localStorage.setItem("apartmentFavorites", JSON.stringify(favorites.filter((f: ApartmentFavoriteTracker) => f.apartmentId !== apartmentId)));
  
  const requests = JSON.parse(localStorage.getItem("maintenanceRequests") || "[]");
  localStorage.setItem("maintenanceRequests", JSON.stringify(requests.filter((r: MaintenanceRequest) => r.apartmentId !== apartmentId)));
  
  const messages = JSON.parse(localStorage.getItem("landlordMessages") || "[]");
  localStorage.setItem("landlordMessages", JSON.stringify(messages.filter((m: LandlordMessage) => m.apartmentId !== apartmentId)));
  
  const tenants = JSON.parse(localStorage.getItem("tenantRecords") || "[]");
  localStorage.setItem("tenantRecords", JSON.stringify(tenants.filter((t: TenantRecord) => t.apartmentId !== apartmentId)));
}

export function unpublishApartment(apartmentId: string): void {
  const apartments = JSON.parse(localStorage.getItem("customApartments") || "[]");
  const apt = apartments.find((a: any) => a.id === apartmentId);
  if (apt) {
    apt.isPublished = false;
    localStorage.setItem("customApartments", JSON.stringify(apartments));
  }
}

export function publishApartment(apartmentId: string): void {
  const apartments = JSON.parse(localStorage.getItem("customApartments") || "[]");
  const apt = apartments.find((a: any) => a.id === apartmentId);
  if (apt) {
    apt.isPublished = true;
    localStorage.setItem("customApartments", JSON.stringify(apartments));
  }
}

