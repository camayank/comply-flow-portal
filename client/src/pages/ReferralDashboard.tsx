import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Gift,
  Share2,
  Wallet,
  TrendingUp,
  Users,
  Copy,
  CheckCircle2,
  Clock,
  DollarSign,
  Mail,
  Sparkles,
} from "lucide-react";

export default function ReferralDashboard() {
  const [copiedCode, setCopiedCode] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get clientId from localStorage (in production, get from auth context)
  const clientId = 1; // Replace with actual auth

  const { data: referralData, isLoading } = useQuery({
    queryKey: ['/api/referrals/my-code', clientId],
  });

  const { data: walletData } = useQuery({
    queryKey: ['/api/wallet', clientId],
  });

  const generateCodeMutation = useMutation({
    mutationFn: () => apiRequest('/api/referrals/generate-code', 'POST', { clientId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/referrals/my-code', clientId] });
      toast({ title: "Success", description: "Referral code generated!" });
    },
  });

  const copyReferralLink = () => {
    if (referralData?.code) {
      const link = `${window.location.origin}/register?ref=${referralData.code}`;
      navigator.clipboard.writeText(link);
      setCopiedCode(true);
      toast({
        title: "Copied!",
        description: "Referral link copied to clipboard",
      });
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const shareViaWhatsApp = () => {
    if (referralData?.code) {
      const link = `${window.location.origin}/register?ref=${referralData.code}`;
      const message = encodeURIComponent(
        `Hey! I'm using LegalSuvidha for my startup's compliance. You should check them out! Get 10% credit on your first service when you sign up using my link: ${link}`
      );
      window.open(`https://wa.me/?text=${message}`, '_blank');
    }
  };

  const shareViaEmail = () => {
    if (referralData?.code) {
      const link = `${window.location.origin}/register?ref=${referralData.code}`;
      const subject = encodeURIComponent('Check out LegalSuvidha - Startup Compliance Made Easy');
      const body = encodeURIComponent(
        `I've been using LegalSuvidha for my startup's compliance needs and thought you might find it helpful!\n\nUse my referral code ${referralData.code} to get started and we both get credits!\n\nSign up here: ${link}`
      );
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Loading referral data...</div>
      </div>
    );
  }

  if (!referralData && !generateCodeMutation.isPending) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <Gift className="h-16 w-16 mx-auto text-primary mb-4" />
            <CardTitle>Start Earning Referral Credits!</CardTitle>
            <CardDescription>
              Refer startups and earn 10% credit on every successful referral
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => generateCodeMutation.mutate()}
              className="w-full"
              disabled={generateCodeMutation.isPending}
            >
              {generateCodeMutation.isPending ? "Generating..." : "Generate My Referral Code"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 p-3 rounded-full">
            <Gift className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Referral Program</h1>
            <p className="text-muted-foreground">Earn credits by referring startups</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Wallet Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ₹{parseFloat(walletData?.wallet?.balance || "0").toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Referrals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{referralData?.stats?.totalReferrals || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Successful
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {referralData?.stats?.successfulReferrals || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Total Earned
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ₹{parseFloat(walletData?.wallet?.totalReferralEarnings || "0").toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-purple-50 dark:to-gray-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Your Referral Code
            </CardTitle>
            <CardDescription>
              Share this code with other startups and earn 10% credit when they complete their first service
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                value={referralData?.code || ''}
                readOnly
                className="text-2xl font-bold text-center tracking-wider"
                data-testid="referral-code-input"
              />
              <Button
                onClick={copyReferralLink}
                variant="outline"
                className="shrink-0"
                data-testid="button-copy-code"
              >
                {copiedCode ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Button onClick={copyReferralLink} variant="outline" className="w-full">
                <Share2 className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
              <Button onClick={shareViaWhatsApp} variant="outline" className="w-full">
                WhatsApp
              </Button>
              <Button onClick={shareViaEmail} variant="outline" className="w-full">
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-yellow-900 dark:text-yellow-100">
                <strong>How it works:</strong> When someone signs up using your referral code and completes their first service, you'll receive 10% of their service amount as wallet credit!
              </p>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="referrals" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="referrals">Referrals</TabsTrigger>
            <TabsTrigger value="transactions">Wallet Transactions</TabsTrigger>
          </TabsList>

          <TabsContent value="referrals">
            <Card>
              <CardHeader>
                <CardTitle>Your Referrals</CardTitle>
                <CardDescription>Track the status of people you've referred</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {referralData?.referrals && referralData.referrals.length > 0 ? (
                    referralData.referrals.map((referral: any) => (
                      <ReferralCard key={referral.id} referral={referral} />
                    ))
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No referrals yet. Start sharing your code!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Wallet Transactions</CardTitle>
                <CardDescription>Your earning and spending history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {walletData?.transactions && walletData.transactions.length > 0 ? (
                    walletData.transactions.map((tx: any) => (
                      <TransactionCard key={tx.id} transaction={tx} />
                    ))
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No transactions yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ReferralCard({ referral }: any) {
  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    pending: { label: "Link Shared", color: "bg-blue-100 text-blue-800", icon: Clock },
    registered: { label: "Registered", color: "bg-purple-100 text-purple-800", icon: Users },
    onboarded: { label: "Onboarded", color: "bg-yellow-100 text-yellow-800", icon: CheckCircle2 },
    credited: { label: "Credited", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
    expired: { label: "Expired", color: "bg-gray-100 text-gray-800", icon: Clock },
  };

  const config = statusConfig[referral.status] || statusConfig.pending;
  const StatusIcon = config.icon;

  return (
    <div className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium">{referral.refereeEmail}</p>
            <Badge className={config.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {config.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Referred {new Date(referral.referredAt).toLocaleDateString()}
          </p>
          {referral.isCredited && (
            <p className="text-sm font-semibold text-green-600 mt-1">
              Earned: ₹{parseFloat(referral.creditAmount).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function TransactionCard({ transaction }: any) {
  const isCredit = transaction.type.includes('credit');

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${isCredit ? 'bg-green-100' : 'bg-red-100'}`}>
          <DollarSign className={`h-4 w-4 ${isCredit ? 'text-green-600' : 'text-red-600'}`} />
        </div>
        <div>
          <p className="font-medium">{transaction.description}</p>
          <p className="text-sm text-muted-foreground">
            {new Date(transaction.createdAt).toLocaleString()}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className={`font-bold ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
          {isCredit ? '+' : '-'}₹{parseFloat(transaction.amount).toLocaleString()}
        </p>
        <p className="text-sm text-muted-foreground">
          Balance: ₹{parseFloat(transaction.balanceAfter).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
