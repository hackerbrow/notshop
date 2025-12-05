import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, MessageSquare } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const Support = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["support-tickets", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", session!.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const createTicketMutation = useMutation({
    mutationFn: async () => {
      if (!session?.user?.id) throw new Error("Oturum bulunamadı");

      const { error } = await supabase
        .from("support_tickets")
        .insert({
          user_id: session.user.id,
          subject,
          message,
          priority,
          status: "open",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Destek talebi oluşturuldu", description: "Talebiniz en kısa sürede değerlendirilecektir" });
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      setIsCreateDialogOpen(false);
      setSubject("");
      setMessage("");
      setPriority("normal");
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      open: { variant: "default", label: "Açık" },
      in_progress: { variant: "secondary", label: "İşlemde" },
      closed: { variant: "outline", label: "Kapalı" },
    };
    const config = variants[status] || variants.open;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      low: { variant: "outline", label: "Düşük" },
      normal: { variant: "secondary", label: "Normal" },
      high: { variant: "destructive", label: "Yüksek" },
    };
    const config = variants[priority] || variants.normal;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Destek sistemine erişmek için giriş yapmalısınız</h1>
          <Button onClick={() => window.location.href = "/auth"}>Giriş Yap</Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">
              <span className="bg-gradient-to-r from-brand-blue to-primary bg-clip-text text-transparent">
                Destek Talepleri
              </span>
            </h1>
            <p className="text-muted-foreground">Tüm destek taleplerinizi buradan yönetebilirsiniz</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Yeni Talep
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Yeni Destek Talebi</DialogTitle>
                <DialogDescription>Sorununuzu detaylı bir şekilde açıklayın</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="subject">Konu</Label>
                  <Input
                    id="subject"
                    placeholder="Talep konusu"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="priority">Öncelik</Label>
                  <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Düşük</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">Yüksek</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="message">Mesaj</Label>
                  <Textarea
                    id="message"
                    placeholder="Sorununuzu detaylı olarak açıklayın"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                  />
                </div>
                <Button
                  onClick={() => createTicketMutation.mutate()}
                  disabled={!subject || !message || createTicketMutation.isPending}
                  className="w-full"
                >
                  {createTicketMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Talep Oluştur"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-4">
            {tickets?.length === 0 ? (
              <Card className="border-glass-border bg-card/50 backdrop-blur-sm">
                <CardContent className="py-12 text-center">
                  <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Henüz Destek Talebiniz Yok</h3>
                  <p className="text-muted-foreground">Yeni bir talep oluşturarak destek alabilirsiniz</p>
                </CardContent>
              </Card>
            ) : (
              tickets?.map((ticket: any) => (
                <Card 
                  key={ticket.id} 
                  className="cursor-pointer hover:border-primary transition-colors border-glass-border bg-card/50 backdrop-blur-sm" 
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl">{ticket.subject}</CardTitle>
                        <CardDescription className="mt-1">
                          {new Date(ticket.created_at).toLocaleDateString("tr-TR")}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {getStatusBadge(ticket.status)}
                        {getPriorityBadge(ticket.priority)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">{ticket.message}</p>
                    {ticket.admin_response && (
                      <div className="mt-4 p-3 rounded-lg bg-brand-blue/10 border border-brand-blue/20">
                        <p className="text-xs font-medium text-brand-blue mb-1">Admin Yanıtı:</p>
                        <p className="text-sm">{ticket.admin_response}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedTicket?.subject}</DialogTitle>
              <DialogDescription>
                {selectedTicket && new Date(selectedTicket.created_at).toLocaleDateString("tr-TR")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm">{selectedTicket?.message}</p>
              </div>
              {selectedTicket?.admin_response && (
                <div className="p-4 rounded-lg bg-brand-blue/10 border border-brand-blue/20">
                  <p className="text-xs font-medium text-brand-blue mb-2">Admin Yanıtı:</p>
                  <p className="text-sm">{selectedTicket.admin_response}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Footer />
    </div>
  );
};

export default Support;