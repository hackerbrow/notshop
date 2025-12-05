import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet as WalletIcon, ArrowDownToLine } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Withdraw = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState("");
  const [bankIban, setBankIban] = useState("");

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: wallet } = useQuery({
    queryKey: ["wallet", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", session!.user.id)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (!session) {
      navigate("/auth");
    }
  }, [session, navigate]);

  const balance = wallet?.balance || 0;

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast({ title: "Hata", description: "Geçerli bir tutar girin", variant: "destructive" });
      return;
    }

    if (!bankName || !bankAccountHolder || !bankIban) {
      toast({ title: "Hata", description: "Lütfen tüm banka bilgilerini doldurun", variant: "destructive" });
      return;
    }

    const ibanClean = bankIban.replace(/\s/g, '').toUpperCase();
    if (!ibanClean.startsWith('TR') || ibanClean.length !== 26) {
      toast({ title: "Hata", description: "Geçerli bir TR IBAN giriniz", variant: "destructive" });
      return;
    }

    if (parseFloat(withdrawAmount) < 50) {
      toast({ title: "Hata", description: "Minimum çekim tutarı 50 TL'dir", variant: "destructive" });
      return;
    }

    if (parseFloat(withdrawAmount) > balance) {
      toast({ title: "Hata", description: "Yetersiz bakiye", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase.from("withdrawal_requests").insert({
        user_id: session!.user.id,
        amount: parseFloat(withdrawAmount),
        payment_method: "bank_transfer",
        payment_details: { bank_name: bankName, account_holder: bankAccountHolder, iban: ibanClean },
        status: "pending",
      });

      if (error) throw error;

      toast({ title: "Başarılı", description: "Çekim talebiniz oluşturuldu" });
      setWithdrawAmount("");
    } catch (error: any) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">
          <span className="bg-gradient-to-r from-brand-blue to-primary bg-clip-text text-transparent">Para Çek</span>
        </h1>

        <Card className="border-glass-border bg-gradient-to-br from-brand-blue/10 to-primary/10 backdrop-blur-sm mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Mevcut Bakiye</p>
                <p className="text-4xl font-bold text-brand-blue">₺{Number(balance).toFixed(2)}</p>
              </div>
              <WalletIcon className="w-16 h-16 text-brand-blue opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-glass-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownToLine className="w-5 h-5 text-brand-blue" />
              Para Çekme Talebi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Banka Adı *</Label>
              <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Örn: Ziraat Bankası" className="bg-dark-surface border-glass-border" />
            </div>
            <div>
              <Label>Hesap Sahibi *</Label>
              <Input value={bankAccountHolder} onChange={(e) => setBankAccountHolder(e.target.value)} placeholder="Ad Soyad" className="bg-dark-surface border-glass-border" />
            </div>
            <div>
              <Label>IBAN *</Label>
              <Input value={bankIban} onChange={(e) => setBankIban(e.target.value)} placeholder="TR00 0000 0000 0000 0000 0000 00" className="bg-dark-surface border-glass-border font-mono" maxLength={32} />
            </div>
            <div className="border-t border-glass-border pt-4">
              <Label>Çekilecek Tutar (₺) *</Label>
              <Input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="0.00" className="bg-dark-surface border-glass-border" />
            </div>
            <div className="p-3 rounded-lg bg-dark-surface/50 text-sm">
              <p className="text-muted-foreground">Minimum: ₺50 | Maksimum: ₺{Number(balance).toFixed(2)}</p>
            </div>
            <Button onClick={handleWithdraw} className="w-full bg-gradient-to-r from-brand-blue to-primary hover:opacity-90">
              <ArrowDownToLine className="w-4 h-4 mr-2" />
              Çekim Talebi Oluştur
            </Button>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default Withdraw;