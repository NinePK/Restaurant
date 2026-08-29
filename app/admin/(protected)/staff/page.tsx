"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, KeyRound, Loader2, Pencil, Plus, ShieldCheck, Trash2, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { defaultPermissionsByRole, permissionItems } from "@/lib/permissions";
import { formatCurrency, getRoleLabel, getWageTypeLabel } from "@/lib/utils";

type WageType = "DAILY" | "HOURLY" | "MONTHLY";
type StaffRole = "MANAGER" | "CASHIER" | "KITCHEN" | "STAFF";
type EditableRole = "OWNER" | StaffRole;

interface Staff {
  id: string;
  name: string;
  phone: string | null;
  position: string | null;
  wageType: WageType;
  wageRate: number;
  isActive: boolean;
  user: { username: string; role: string; isActive: boolean } | null;
}

interface StaffPosition {
  id: string;
  name: string;
  permissions: string[];
}

interface UserAccount {
  id: string;
  username: string;
  role: EditableRole;
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  staffProfile: { id: string; name: string; position: string | null } | null;
}

interface StaffForm {
  name: string;
  phone: string;
  position: string;
  wageType: WageType;
  wageRate: string;
}

interface AccountForm {
  username: string;
  password: string;
  role: StaffRole;
  permissions: string[];
}

interface EditAccountForm {
  id: string;
  username: string;
  password: string;
  role: EditableRole;
  permissions: string[];
  isActive: boolean;
}

const emptyStaffForm: StaffForm = {
  name: "",
  phone: "",
  position: "",
  wageType: "DAILY",
  wageRate: "0",
};

const emptyAccountForm: AccountForm = {
  username: "",
  password: "",
  role: "CASHIER",
  permissions: [...defaultPermissionsByRole.CASHIER],
};

const createAccountRoles: { value: StaffRole; label: string }[] = [
  { value: "CASHIER", label: "แคชเชียร์" },
  { value: "KITCHEN", label: "ครัว" },
  { value: "STAFF", label: "พนักงาน" },
  { value: "MANAGER", label: "ผู้จัดการ" },
];

const editAccountRoles: { value: EditableRole; label: string }[] = [
  { value: "OWNER", label: "เจ้าของร้าน" },
  ...createAccountRoles,
];

function PermissionChecklist({
  value,
  onChange,
}: {
  value: string[];
  onChange: (permissions: string[]) => void;
}) {
  const permissionsBySection = useMemo(
    () =>
      permissionItems.reduce(
        (groups, item) => {
          groups[item.section] = [...(groups[item.section] || []), item];
          return groups;
        },
        {} as Record<string, (typeof permissionItems)[number][]>
      ),
    []
  );

  const togglePermission = (permission: string) => {
    onChange(value.includes(permission) ? value.filter((item) => item !== permission) : [...value, permission]);
  };

  return (
    <div className="space-y-4">
      {Object.entries(permissionsBySection).map(([section, permissions]) => (
        <div key={section}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#66736c]">{section}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {permissions.map((permission) => (
              <label
                key={permission.key}
                className="flex cursor-pointer items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm shadow-sm"
              >
                <input
                  type="checkbox"
                  checked={value.includes(permission.key)}
                  onChange={() => togglePermission(permission.key)}
                />
                {permission.label}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [positions, setPositions] = useState<StaffPosition[]>([]);
  const [form, setForm] = useState<StaffForm>(emptyStaffForm);
  const [accountForm, setAccountForm] = useState<AccountForm>(emptyAccountForm);
  const [accountEnabled, setAccountEnabled] = useState(false);
  const [newPositionName, setNewPositionName] = useState("");
  const [newPositionPermissions, setNewPositionPermissions] = useState<string[]>([...defaultPermissionsByRole.CASHIER]);
  const [editAccountForm, setEditAccountForm] = useState<EditAccountForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPosition, setSavingPosition] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [deletingStaffId, setDeletingStaffId] = useState<string | null>(null);
  const [positionDialogOpen, setPositionDialogOpen] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [editAccountDialogOpen, setEditAccountDialogOpen] = useState(false);

  const activeCount = useMemo(() => staff.filter((item) => item.isActive).length, [staff]);
  const activeAccounts = useMemo(() => accounts.filter((account) => account.isActive).length, [accounts]);

  const loadStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/staff");
      if (!res.ok) throw new Error("LOAD_STAFF_FAILED");
      setStaff(await res.json());
    } catch {
      toast.error("โหลดรายชื่อพนักงานไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const loadPositions = async () => {
    const res = await fetch("/api/staff/positions");
    if (res.ok) setPositions(await res.json());
  };

  const loadAccounts = async () => {
    const res = await fetch("/api/users");
    if (res.ok) setAccounts(await res.json());
  };

  const refreshAll = async () => {
    await Promise.all([loadStaff(), loadPositions(), loadAccounts()]);
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const selectedPosition = positions.find((position) => position.name === form.position);

  const selectPosition = (value: string) => {
    const position = positions.find((item) => item.name === value);
    setForm((current) => ({ ...current, position: value === "NONE" ? "" : value }));
    if (position && !accountEnabled) {
      setAccountForm((current) => ({ ...current, permissions: position.permissions }));
    }
  };

  const createStaff = async () => {
    if (!form.name.trim()) {
      toast.error("กรอกชื่อพนักงานก่อน");
      return;
    }

    if (accountEnabled && (!accountForm.username.trim() || !accountForm.password)) {
      toast.error("กรอก username และ password ให้ครบ หรือปิดการสร้าง Account");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          position: form.position.trim() || null,
          wageType: form.wageType,
          wageRate: Number(form.wageRate || 0),
          isActive: true,
          username: accountEnabled ? accountForm.username.trim() : "",
          password: accountEnabled ? accountForm.password : "",
          role: accountEnabled ? accountForm.role : undefined,
          permissions: accountEnabled ? accountForm.permissions : [],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "เพิ่มพนักงานไม่สำเร็จ");
        return;
      }

      toast.success(accountEnabled ? "เพิ่มพนักงานและ Account แล้ว" : "เพิ่มพนักงานแล้ว");
      setForm(emptyStaffForm);
      setAccountForm(emptyAccountForm);
      setAccountEnabled(false);
      refreshAll();
    } finally {
      setSaving(false);
    }
  };

  const addPosition = async () => {
    if (!newPositionName.trim()) {
      toast.error("กรอกชื่อตำแหน่งก่อน");
      return;
    }

    setSavingPosition(true);
    try {
      const res = await fetch("/api/staff/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newPositionName.trim(), permissions: newPositionPermissions }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "เพิ่มตำแหน่งไม่สำเร็จ");
        return;
      }

      toast.success("เพิ่มตำแหน่งแล้ว");
      setNewPositionName("");
      setNewPositionPermissions([...defaultPermissionsByRole.CASHIER]);
      setForm((current) => ({ ...current, position: data.name }));
      setAccountForm((current) => ({ ...current, permissions: data.permissions }));
      setPositionDialogOpen(false);
      loadPositions();
    } finally {
      setSavingPosition(false);
    }
  };

  const saveAccountDraft = () => {
    if (!accountForm.username.trim() || !accountForm.password) {
      toast.error("กรอก username และ password ให้ครบ");
      return;
    }

    if (accountForm.password.length < 6) {
      toast.error("password ต้องมีอย่างน้อย 6 ตัว");
      return;
    }

    setAccountEnabled(true);
    setAccountDialogOpen(false);
  };

  const clearAccountDraft = () => {
    setAccountEnabled(false);
    setAccountForm(emptyAccountForm);
  };

  const openEditAccount = (account: UserAccount) => {
    setEditAccountForm({
      id: account.id,
      username: account.username,
      password: "",
      role: account.role,
      permissions: account.permissions,
      isActive: account.isActive,
    });
    setEditAccountDialogOpen(true);
  };

  const updateAccount = async () => {
    if (!editAccountForm) return;

    setSavingAccount(true);
    try {
      const res = await fetch(`/api/users/${editAccountForm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: editAccountForm.username.trim(),
          password: editAccountForm.password,
          role: editAccountForm.role,
          permissions: editAccountForm.permissions,
          isActive: editAccountForm.isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "อัปเดต Account ไม่สำเร็จ");
        return;
      }

      toast.success("อัปเดต Account แล้ว");
      setEditAccountDialogOpen(false);
      setEditAccountForm(null);
      refreshAll();
    } finally {
      setSavingAccount(false);
    }
  };

  const deleteAccount = async (account: UserAccount) => {
    if (account.role === "OWNER") {
      toast.error("ลบบัญชีเจ้าของร้านไม่ได้");
      return;
    }

    const confirmed = window.confirm(`ลบ Account "${account.username}" ใช่ไหม? พนักงานจะยังอยู่ แต่จะล็อกอินไม่ได้`);
    if (!confirmed) return;

    const res = await fetch(`/api/users/${account.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "ลบ Account ไม่สำเร็จ");
      return;
    }

    toast.success("ลบ Account แล้ว");
    refreshAll();
  };

  const toggleActive = async (person: Staff) => {
    const res = await fetch(`/api/staff/${person.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !person.isActive }),
    });

    if (!res.ok) {
      toast.error("อัปเดตสถานะไม่สำเร็จ");
      return;
    }

    refreshAll();
  };

  const deleteStaff = async (person: Staff) => {
    const confirmed = window.confirm(
      `ลบรายชื่อ "${person.name}" ใช่ไหม?\n\nถ้าพนักงานคนนี้มี Account, ประวัติเช็คชื่อ หรือเงินเดือน ระบบจะลบข้อมูลที่ผูกกับรายชื่อนี้ไปด้วย`
    );
    if (!confirmed) return;

    setDeletingStaffId(person.id);
    try {
      const res = await fetch(`/api/staff/${person.id}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "ลบรายชื่อพนักงานไม่สำเร็จ");
        return;
      }

      toast.success("ลบรายชื่อพนักงานแล้ว");
      refreshAll();
    } finally {
      setDeletingStaffId(null);
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <section className="grid gap-3 md:grid-cols-4">
        <div className="metric-tile">
          <p className="metric-label">พนักงานทั้งหมด</p>
          <p className="metric-value">{staff.length}</p>
          <p className="metric-helper">คน</p>
        </div>
        <div className="metric-tile">
          <p className="metric-label">กำลังใช้งาน</p>
          <p className="metric-value">{activeCount}</p>
          <p className="metric-helper">active</p>
        </div>
        <div className="metric-tile">
          <p className="metric-label">Account</p>
          <p className="metric-value">{accounts.length}</p>
          <p className="metric-helper">{activeAccounts} เปิดใช้งาน</p>
        </div>
        <div className="metric-tile">
          <p className="metric-label">ตำแหน่ง</p>
          <p className="metric-value">{positions.length}</p>
          <p className="metric-helper">ตั้งสิทธิ์ได้</p>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[390px_1fr]">
        <div className="panel-surface p-5">
          <p className="section-eyebrow">เพิ่มพนักงาน</p>
          <h2 className="mt-2 text-xl font-semibold text-[#17211f]">ข้อมูลหลัก</h2>

          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label>ชื่อ</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>ตำแหน่ง</Label>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <Select value={form.position || "NONE"} onValueChange={selectPosition}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกตำแหน่ง" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">ไม่ระบุ</SelectItem>
                    {positions.map((position) => (
                      <SelectItem key={position.id} value={position.name}>
                        {position.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setPositionDialogOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  เพิ่มตำแหน่ง
                </Button>
              </div>
              {selectedPosition && (
                <p className="text-xs text-[#66736c]">ตำแหน่งนี้มีสิทธิ์ {selectedPosition.permissions.length} ส่วน</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>เบอร์โทร</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>ประเภทค่าแรง</Label>
                <Select value={form.wageType} onValueChange={(value) => setForm({ ...form, wageType: value as WageType })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">รายวัน</SelectItem>
                    <SelectItem value="HOURLY">รายชั่วโมง</SelectItem>
                    <SelectItem value="MONTHLY">รายเดือน</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>ค่าแรง</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.wageRate}
                  onChange={(e) => setForm({ ...form, wageRate: e.target.value })}
                />
              </div>
            </div>

            <div className="rounded-[1.25rem] border border-[#dfd0bd] bg-[#fbf7ef] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-[#17211f]">Account สำหรับล็อกอิน</p>
                  <p className="mt-1 text-xs text-[#66736c]">
                    {accountEnabled ? `${accountForm.username} · ${getRoleLabel(accountForm.role)}` : "ไม่สร้างก็ได้ ถ้าเป็นพนักงานที่ไม่ต้องเข้าระบบ"}
                  </p>
                </div>
                <ShieldCheck className="h-5 w-5 text-[#b96526]" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" className="rounded-full" onClick={() => setAccountDialogOpen(true)}>
                  <KeyRound className="h-4 w-4" />
                  {accountEnabled ? "แก้ Account" : "สร้าง Account"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-full"
                  onClick={clearAccountDraft}
                  disabled={!accountEnabled}
                >
                  ไม่สร้าง
                </Button>
              </div>
            </div>

            <Button onClick={createStaff} disabled={saving} className="w-full rounded-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              เพิ่มพนักงาน
            </Button>
          </div>
        </div>

        <div className="space-y-5">
          <div className="panel-surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="section-eyebrow">ทีมงาน</p>
                <h2 className="mt-2 text-xl font-semibold text-[#17211f]">รายชื่อพนักงาน</h2>
              </div>
              {loading && <Loader2 className="h-5 w-5 animate-spin text-[#b96526]" />}
            </div>

            <div className="grid gap-3 2xl:grid-cols-2">
              {staff.map((person) => (
                <div key={person.id} className="rounded-[1.4rem] border border-[#dfd0bd] bg-[#fbf7ef] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#b96526]">
                        <UserRound className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-[#17211f]">{person.name}</p>
                          <Badge variant={person.isActive ? "success" : "secondary"}>
                            {person.isActive ? "ใช้งาน" : "ปิด"}
                          </Badge>
                        </div>
                        <p className="text-sm text-[#66736c]">
                          {person.position || "-"} · {person.phone || "-"}
                        </p>
                        {person.user && (
                          <p className="mt-1 text-xs text-[#66736c]">
                            {person.user.username} · {getRoleLabel(person.user.role)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold text-[#17211f]">{formatCurrency(person.wageRate)}</p>
                      <p className="text-xs text-[#66736c]">{getWageTypeLabel(person.wageType)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <Button variant="outline" size="sm" className="rounded-full" onClick={() => toggleActive(person)}>
                      {person.isActive ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                      {person.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full text-red-600 hover:text-red-700"
                      onClick={() => deleteStaff(person)}
                      disabled={deletingStaffId === person.id}
                    >
                      {deletingStaffId === person.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      ลบรายชื่อ
                    </Button>
                  </div>
                </div>
              ))}

              {!loading && staff.length === 0 && (
                <div className="panel-muted p-8 text-center text-sm text-muted-foreground">ยังไม่มีพนักงาน</div>
              )}
            </div>
          </div>

          <div className="panel-surface p-5">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="section-eyebrow">Account</p>
                <h2 className="mt-2 text-xl font-semibold text-[#17211f]">จัดการบัญชีและรหัสผ่าน</h2>
              </div>
              <p className="text-sm text-[#66736c]">แก้ username, เปลี่ยนรหัส, เปิด/ปิดสิทธิ์ได้จากตรงนี้</p>
            </div>

            <div className="overflow-hidden rounded-[1.25rem] border border-[#dfd0bd] bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>บัญชี</TableHead>
                    <TableHead>พนักงาน</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-semibold text-[#17211f]">{account.username}</TableCell>
                      <TableCell>
                        {account.staffProfile ? (
                          <div>
                            <p>{account.staffProfile.name}</p>
                            <p className="text-xs text-[#66736c]">{account.staffProfile.position || "-"}</p>
                          </div>
                        ) : (
                          <span className="text-[#66736c]">ไม่ผูกพนักงาน</span>
                        )}
                      </TableCell>
                      <TableCell>{getRoleLabel(account.role)}</TableCell>
                      <TableCell>
                        <Badge variant={account.isActive ? "success" : "secondary"}>
                          {account.isActive ? "เปิด" : "ปิด"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" className="rounded-full" onClick={() => openEditAccount(account)}>
                            <Pencil className="h-4 w-4" />
                            แก้
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-full text-red-600 hover:text-red-700"
                            onClick={() => deleteAccount(account)}
                            disabled={account.role === "OWNER"}
                          >
                            <Trash2 className="h-4 w-4" />
                            ลบ
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {accounts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-[#66736c]">
                        ยังไม่มี Account
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </section>

      <Dialog open={positionDialogOpen} onOpenChange={setPositionDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-[1.5rem] bg-[#f6efe4]">
          <DialogHeader>
            <DialogTitle>เพิ่มตำแหน่ง</DialogTitle>
            <DialogDescription>ตั้งชื่อและเลือกว่าส่วนนี้เห็นหน้าไหนได้บ้าง</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ชื่อตำแหน่ง</Label>
              <Input
                value={newPositionName}
                onChange={(e) => setNewPositionName(e.target.value)}
                placeholder="เช่น หัวหน้าแคชเชียร์"
              />
            </div>
            <PermissionChecklist value={newPositionPermissions} onChange={setNewPositionPermissions} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPositionDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={addPosition} disabled={savingPosition}>
              {savingPosition && <Loader2 className="h-4 w-4 animate-spin" />}
              บันทึกตำแหน่ง
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-[1.5rem] bg-[#f6efe4]">
          <DialogHeader>
            <DialogTitle>สร้าง Account ให้พนักงาน</DialogTitle>
            <DialogDescription>ใช้สำหรับล็อกอินเข้าแอดมิน และจำกัดเมนูที่เห็นได้</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={accountForm.role}
                onValueChange={(value) =>
                  setAccountForm({
                    ...accountForm,
                    role: value as StaffRole,
                    permissions: [...(defaultPermissionsByRole[value] || accountForm.permissions)],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {createAccountRoles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={accountForm.username} onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={accountForm.password}
                  onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
                  placeholder="อย่างน้อย 6 ตัว"
                />
              </div>
            </div>

            <PermissionChecklist
              value={accountForm.permissions}
              onChange={(permissions) => setAccountForm({ ...accountForm, permissions })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccountDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={saveAccountDraft}>ใช้ Account นี้</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editAccountDialogOpen} onOpenChange={setEditAccountDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-[1.5rem] bg-[#f6efe4]">
          <DialogHeader>
            <DialogTitle>แก้ไข Account</DialogTitle>
            <DialogDescription>เว้นช่อง password ว่างไว้ถ้าไม่ต้องการเปลี่ยนรหัส</DialogDescription>
          </DialogHeader>

          {editAccountForm && (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input
                    value={editAccountForm.username}
                    onChange={(e) => setEditAccountForm({ ...editAccountForm, username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password ใหม่</Label>
                  <Input
                    type="password"
                    value={editAccountForm.password}
                    onChange={(e) => setEditAccountForm({ ...editAccountForm, password: e.target.value })}
                    placeholder="ไม่เปลี่ยนให้เว้นว่าง"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={editAccountForm.role}
                    onValueChange={(value) =>
                      setEditAccountForm({
                        ...editAccountForm,
                        role: value as EditableRole,
                        permissions: [...(defaultPermissionsByRole[value] || editAccountForm.permissions)],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {editAccountRoles.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex items-center gap-3 rounded-[1.25rem] border border-[#dfd0bd] bg-white px-4 py-3 text-sm">
                  <input
                    type="checkbox"
                    checked={editAccountForm.isActive}
                    onChange={(e) => setEditAccountForm({ ...editAccountForm, isActive: e.target.checked })}
                  />
                  เปิดใช้งาน Account นี้
                </label>
              </div>

              <PermissionChecklist
                value={editAccountForm.permissions}
                onChange={(permissions) => setEditAccountForm({ ...editAccountForm, permissions })}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditAccountDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={updateAccount} disabled={savingAccount || !editAccountForm}>
              {savingAccount && <Loader2 className="h-4 w-4 animate-spin" />}
              บันทึก Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
