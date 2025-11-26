import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Check, X, Eye } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

const WithdrawalsTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const { data: withdrawals, isLoading } = useQuery({
    queryKey: ["admin-withdrawals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const userIds = [...new Set(data.map((w: any) => w.user_id))];
      
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", userIds);

      const profilesMap = new Map(profilesData?.map((p: any) => [p.id, p]) || []);

      return data.map((withdrawal: any) => ({
        ...withdrawal,
        profiles: profilesMap.get(withdrawal.user_id),
      }));

      if (error) throw error;
      return data;
    },
  });

  const updateWithdrawalMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      notes,
    }: {
      id: string;
      status: string;
      notes: string;
    }) => {
      const { data } = await supabase.auth.getSession();
      
      const { error } = await supabase
        .from("withdrawal_requests")
        .update({
          status: status as any,
          admin_note: notes,
          processed_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Çekim talebi güncellendi",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      setSelectedWithdrawal(null);
      setAdminNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleApprove = (withdrawal: any) => {
    if (window.confirm("Bu çekim talebini onaylamak istediğinizden emin misiniz?")) {
      updateWithdrawalMutation.mutate({
        id: withdrawal.id,
        status: "approved",
        notes: adminNotes,
      });
    }
  };

  const handleReject = (withdrawal: any) => {
    if (!adminNotes.trim()) {
      toast({
        title: "Hata",
        description: "Ret nedeni belirtmelisiniz",
        variant: "destructive",
      });
      return;
    }
    
    if (window.confirm("Bu çekim talebini reddetmek istediğinizden emin misiniz?")) {
      updateWithdrawalMutation.mutate({
        id: withdrawal.id,
        status: "rejected",
        notes: adminNotes,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
      completed: "default",
    };

    const labels: Record<string, string> = {
      pending: "Beklemede",
      approved: "Onaylandı",
      rejected: "Reddedildi",
      completed: "Tamamlandı",
    };

    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Para Çekim Talepleri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kullanıcı</TableHead>
                  <TableHead>Tutar</TableHead>
                  <TableHead>Yöntem</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawals && withdrawals.length > 0 ? (
                  withdrawals.map((withdrawal: any) => (
                    <TableRow key={withdrawal.id}>
                      <TableCell className="font-medium">
                        {withdrawal.profiles?.username || "Anonim"}
                      </TableCell>
                      <TableCell>{withdrawal.amount} ₺</TableCell>
                      <TableCell>{withdrawal.payment_method || "Banka Transferi"}</TableCell>
                      <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                      <TableCell>
                        {format(new Date(withdrawal.created_at), "dd MMM yyyy, HH:mm", {
                          locale: tr,
                        })}
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedWithdrawal(withdrawal);
                                setAdminNotes(withdrawal.admin_note || "");
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Çekim Talebi Detayları</DialogTitle>
                            </DialogHeader>
                            {selectedWithdrawal && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm text-muted-foreground">Kullanıcı</p>
                                    <p className="font-medium">
                                      {selectedWithdrawal.profiles?.username}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Tutar</p>
                                    <p className="font-medium">{selectedWithdrawal.amount} ₺</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Ödeme Yöntemi</p>
                                    <p className="font-medium">
                                      {selectedWithdrawal.payment_method || "Banka Transferi"}
                                    </p>
                                  </div>
                                  {selectedWithdrawal.payment_details && (
                                    <div className="col-span-2">
                                      <p className="text-sm text-muted-foreground">
                                        Ödeme Detayları
                                      </p>
                                      <pre className="text-sm bg-muted p-2 rounded mt-1">
                                        {JSON.stringify(selectedWithdrawal.payment_details, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                </div>

                                {selectedWithdrawal.status === "pending" && (
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                      Admin Notu
                                    </label>
                                    <Textarea
                                      value={adminNotes}
                                      onChange={(e) => setAdminNotes(e.target.value)}
                                      placeholder="İşlem hakkında notunuz..."
                                      rows={3}
                                    />
                                  </div>
                                )}

                                {selectedWithdrawal.admin_note && (
                                  <div>
                                    <p className="text-sm text-muted-foreground">Admin Notu</p>
                                    <p className="text-sm">{selectedWithdrawal.admin_note}</p>
                                  </div>
                                )}

                                {selectedWithdrawal.status === "pending" && (
                                  <div className="flex gap-2">
                                    <Button
                                      className="flex-1"
                                      onClick={() => handleApprove(selectedWithdrawal)}
                                    >
                                      <Check className="h-4 w-4 mr-2" />
                                      Onayla
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      className="flex-1"
                                      onClick={() => handleReject(selectedWithdrawal)}
                                    >
                                      <X className="h-4 w-4 mr-2" />
                                      Reddet
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Çekim talebi bulunamadı
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WithdrawalsTab;
