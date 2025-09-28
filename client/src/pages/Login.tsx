import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Phone, Shield } from 'lucide-react';
import { useLocation } from 'wouter';

type AuthStep = 'input' | 'verify';

export default function Login() {
  const { t } = useI18n();
  const { login, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [step, setStep] = useState<AuthStep>('input');
  const [contactMethod, setContactMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);

  const handleSendCode = async () => {
    if (contactMethod === 'email' && !email.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    if (contactMethod === 'phone' && !phone.trim()) {
      toast({
        title: 'Error', 
        description: 'Please enter a valid phone number',
        variant: 'destructive',
      });
      return;
    }

    try {
      // For demo purposes, we'll simulate sending a code and go directly to login
      setCodeSent(true);
      toast({
        title: t('auth.login.codeSent'),
        description: 'Demo: Code is 123456',
      });
      setStep('verify');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send verification code',
        variant: 'destructive',
      });
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode !== '123456') {
      toast({
        title: 'Error',
        description: 'Invalid verification code. Demo code is 123456',
        variant: 'destructive',
      });
      return;
    }

    try {
      await login(
        contactMethod === 'email' ? email : undefined,
        contactMethod === 'phone' ? phone : undefined
      );
      
      toast({
        title: 'Welcome!',
        description: 'Successfully signed in',
      });
      
      // Redirect to home page
      setLocation('/');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Login failed. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleBackToInput = () => {
    setStep('input');
    setVerificationCode('');
    setCodeSent(false);
  };

  if (step === 'verify') {
    return (
      <div className="p-6 max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
            <CardTitle>{t('auth.login.title')}</CardTitle>
            <CardDescription className="text-sm">
              {t('auth.login.codeSent')}
              <br />
              <span className="text-xs text-muted-foreground">
                {contactMethod === 'email' ? email : phone}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">{t('auth.login.codeLabel')}</Label>
              <Input
                id="code"
                type="text"
                placeholder={t('auth.login.codePlaceholder')}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                maxLength={6}
                className="text-center text-lg tracking-widest"
                data-testid="input-verification-code"
              />
            </div>
            
            <div className="space-y-2">
              <Button
                onClick={handleVerifyCode}
                disabled={isLoading || verificationCode.length !== 6}
                className="w-full"
                data-testid="button-verify-code"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('auth.login.verifying')}
                  </>
                ) : (
                  t('buttons.verifyCode')
                )}
              </Button>
              
              <Button
                variant="ghost"
                onClick={handleBackToInput}
                disabled={isLoading}
                className="w-full"
                data-testid="button-change-contact"
              >
                {t('auth.login.changeContact')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <Card>
        <CardHeader className="text-center">
          <CardTitle>{t('auth.login.title')}</CardTitle>
          <CardDescription>{t('auth.login.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={contactMethod} onValueChange={(value) => setContactMethod(value as 'email' | 'phone')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email" className="flex items-center gap-2" data-testid="tab-email">
                <Mail className="h-4 w-4" />
                Email
              </TabsTrigger>
              <TabsTrigger value="phone" className="flex items-center gap-2" data-testid="tab-phone">
                <Phone className="h-4 w-4" />
                Phone
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="email" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.login.emailLabel')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('auth.login.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="input-email"
                />
              </div>
              
              <Button
                onClick={handleSendCode}
                disabled={isLoading || !email.trim()}
                className="w-full"
                data-testid="button-send-code-email"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('auth.login.sendingCode')}
                  </>
                ) : (
                  t('buttons.sendCode')
                )}
              </Button>
            </TabsContent>
            
            <TabsContent value="phone" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">{t('auth.login.phoneLabel')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder={t('auth.login.phonePlaceholder')}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  data-testid="input-phone"
                />
              </div>
              
              <Button
                onClick={handleSendCode}
                disabled={isLoading || !phone.trim()}
                className="w-full"
                data-testid="button-send-code-phone"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('auth.login.sendingCode')}
                  </>
                ) : (
                  t('buttons.sendCode')
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}