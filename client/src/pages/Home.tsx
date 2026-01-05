import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Zap,
  BarChart3,
  Users,
  FileText,
  Calendar,
  Clock,
  TrendingUp,
  Smartphone,
  DollarSign,
  ChevronRight,
  CheckCheck,
  XCircle
} from "lucide-react";
import { APP_TITLE } from "@/const";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import LanguageSelector from "@/components/LanguageSelector";

export default function Home() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/val-kira-logo.png"
                alt="Val Kira CRM"
                className="h-10 w-auto"
              />
              <p className="text-xs text-muted-foreground">{t('login.appSubtitle')}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:gap-4">
              <Link href="#pricing">
                <Button variant="ghost" className="h-9 px-3 text-sm">
                  {t('landing.nav.pricing')}
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="ghost" className="h-9 px-3 text-sm">
                  {t('landing.nav.features')}
                </Button>
              </Link>
              <LanguageSelector />
              <Link href="/login">
                <Button className="h-9 px-4 text-sm shadow-lg shadow-primary/20">
                  {t('landing.nav.login')}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-16 md:py-24 overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-grid-pattern"></div>
        <div className="container mx-auto px-4 relative">
          <div className="max-w-5xl mx-auto text-center">
            <Badge className="mb-6 text-sm px-4 py-2 bg-primary/10 text-primary border-primary/20">
              <Zap className="mr-2 h-4 w-4" />
              {t('landing.hero.badge')}
            </Badge>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
                {t('landing.hero.title1')}
              </span>
              <br />
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {t('landing.hero.title2')}
              </span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
              {t('landing.hero.subtitle')} <span className="text-primary font-semibold">{t('landing.hero.subtitleHighlight')}</span>.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/onboarding">
                <Button size="lg" className="text-lg px-8 shadow-xl shadow-primary/20 group w-full sm:w-auto">
                  {t('landing.hero.cta')}
                  <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="#demo">
                <Button size="lg" variant="outline" className="text-lg px-8 w-full sm:w-auto">
                  {t('landing.hero.demo')}
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground mt-6">
              {t('landing.hero.features')}
            </p>
          </div>
        </div>
      </section>

      {/* Problems Section */}
      <section className="py-16 md:py-20 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('landing.problems.title')}
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground">
              {t('landing.problems.subtitle')}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <Card className="border-destructive/50 bg-destructive/5">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <XCircle className="h-8 w-8 text-destructive flex-shrink-0 mt-1" />
                  <div>
                    <CardTitle className="text-lg">{t('landing.problems.lostClient.title')}</CardTitle>
                    <CardDescription className="mt-2">
                      {t('landing.problems.lostClient.description')} <span className="text-destructive font-semibold">{t('landing.problems.lostClient.cost')}</span>.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card className="border-destructive/50 bg-destructive/5">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <XCircle className="h-8 w-8 text-destructive flex-shrink-0 mt-1" />
                  <div>
                    <CardTitle className="text-lg">{t('landing.problems.excelChaos.title')}</CardTitle>
                    <CardDescription className="mt-2">
                      {t('landing.problems.excelChaos.description')} <span className="text-destructive font-semibold">{t('landing.problems.excelChaos.cost')}</span>.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card className="border-destructive/50 bg-destructive/5">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <XCircle className="h-8 w-8 text-destructive flex-shrink-0 mt-1" />
                  <div>
                    <CardTitle className="text-lg">{t('landing.problems.noVisibility.title')}</CardTitle>
                    <CardDescription className="mt-2">
                      {t('landing.problems.noVisibility.description')} <span className="text-destructive font-semibold">{t('landing.problems.noVisibility.cost')}</span>.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              {t('landing.solution.badge')}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('landing.solution.title')}
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              {t('landing.solution.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <CheckCheck className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{t('landing.solution.neverLose.title')}</CardTitle>
                    <CardDescription className="mt-3 text-base">
                      {t('landing.solution.neverLose.description')}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{t('landing.solution.totalVisibility.title')}</CardTitle>
                    <CardDescription className="mt-3 text-base">
                      {t('landing.solution.totalVisibility.description')}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{t('landing.solution.documentsReady.title')}</CardTitle>
                    <CardDescription className="mt-3 text-base">
                      {t('landing.solution.documentsReady.description')}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{t('landing.solution.teamSync.title')}</CardTitle>
                    <CardDescription className="mt-3 text-base">
                      {t('landing.solution.teamSync.description')}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Preview */}
      <section id="features" className="py-16 md:py-20 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('landing.features.title')}
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground">
              {t('landing.features.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <Calendar className="h-12 w-12 text-primary mb-3" />
                <CardTitle>{t('landing.features.calendar.title')}</CardTitle>
                <CardDescription className="mt-2">
                  {t('landing.features.calendar.description')}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <TrendingUp className="h-12 w-12 text-primary mb-3" />
                <CardTitle>{t('landing.features.pipeline.title')}</CardTitle>
                <CardDescription className="mt-2">
                  {t('landing.features.pipeline.description')}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <FileText className="h-12 w-12 text-primary mb-3" />
                <CardTitle>{t('landing.features.documents.title')}</CardTitle>
                <CardDescription className="mt-2">
                  {t('landing.features.documents.description')}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <Clock className="h-12 w-12 text-primary mb-3" />
                <CardTitle>{t('landing.features.reminders.title')}</CardTitle>
                <CardDescription className="mt-2">
                  {t('landing.features.reminders.description')}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <Users className="h-12 w-12 text-primary mb-3" />
                <CardTitle>{t('landing.features.team.title')}</CardTitle>
                <CardDescription className="mt-2">
                  {t('landing.features.team.description')}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <Smartphone className="h-12 w-12 text-primary mb-3" />
                <CardTitle>{t('landing.features.mobile.title')}</CardTitle>
                <CardDescription className="mt-2">
                  {t('landing.features.mobile.description')}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('landing.pricing.title')}
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground">
              {t('landing.pricing.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Starter Plan */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-2xl">{t('landing.pricing.starter.name')}</CardTitle>
                <CardDescription className="text-base mt-2">{t('landing.pricing.starter.description')}</CardDescription>
                <div className="mt-6">
                  <span className="text-5xl font-bold">{t('landing.pricing.starter.price')}</span>
                  <span className="text-muted-foreground">{t('landing.pricing.starter.period')}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{t('landing.pricing.starter.users')}</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{t('landing.pricing.starter.features.clients')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{t('landing.pricing.starter.features.storage')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{t('landing.pricing.starter.features.calendar')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{t('landing.pricing.starter.features.reports')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{t('landing.pricing.starter.features.support')}</span>
                  </li>
                </ul>
                <Link href="/onboarding">
                  <Button className="w-full" variant="outline">
                    {t('landing.pricing.starter.cta')}
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Professional Plan */}
            <Card className="border-primary shadow-xl shadow-primary/10 relative">
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                {t('landing.pricing.professional.badge')}
              </Badge>
              <CardHeader>
                <CardTitle className="text-2xl">{t('landing.pricing.professional.name')}</CardTitle>
                <CardDescription className="text-base mt-2">{t('landing.pricing.professional.description')}</CardDescription>
                <div className="mt-6">
                  <span className="text-5xl font-bold">{t('landing.pricing.professional.price')}</span>
                  <span className="text-muted-foreground">{t('landing.pricing.professional.period')}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{t('landing.pricing.professional.users')}</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-semibold">{t('landing.pricing.professional.features.clients')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-semibold">{t('landing.pricing.professional.features.storage')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{t('landing.pricing.professional.features.allStarter')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{t('landing.pricing.professional.features.analytics')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{t('landing.pricing.professional.features.construction')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{t('landing.pricing.professional.features.api')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{t('landing.pricing.professional.features.support')}</span>
                  </li>
                </ul>
                <Link href="/onboarding">
                  <Button className="w-full shadow-lg shadow-primary/20">
                    {t('landing.pricing.professional.cta')}
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Enterprise Plan */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-2xl">{t('landing.pricing.enterprise.name')}</CardTitle>
                <CardDescription className="text-base mt-2">{t('landing.pricing.enterprise.description')}</CardDescription>
                <div className="mt-6">
                  <span className="text-5xl font-bold">{t('landing.pricing.enterprise.price')}</span>
                  <span className="text-muted-foreground">{t('landing.pricing.enterprise.period')}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{t('landing.pricing.enterprise.users')}</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-semibold">{t('landing.pricing.enterprise.features.clients')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-semibold">{t('landing.pricing.enterprise.features.storage')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{t('landing.pricing.enterprise.features.allPro')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{t('landing.pricing.enterprise.features.onboarding')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{t('landing.pricing.enterprise.features.integrations')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{t('landing.pricing.enterprise.features.support24')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{t('landing.pricing.enterprise.features.sla')}</span>
                  </li>
                </ul>
                <Link href="/onboarding">
                  <Button className="w-full" variant="outline">
                    {t('landing.pricing.enterprise.cta')}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <p className="text-center text-muted-foreground mt-12">
            {t('landing.pricing.allPlans')}
          </p>
        </div>
      </section>

      {/* ROI Section */}
      <section className="py-16 md:py-20 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                {t('landing.roi.title')}
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground">
                {t('landing.roi.subtitle')}
              </p>
            </div>

            <Card className="bg-card border-primary/20">
              <CardContent className="pt-8">
                <div className="grid md:grid-cols-3 gap-8 text-center">
                  <div>
                    <DollarSign className="h-12 w-12 text-primary mx-auto mb-3" />
                    <div className="text-3xl font-bold mb-2">{t('landing.roi.metrics.moreClients')}</div>
                    <p className="text-muted-foreground">{t('landing.roi.metrics.moreClientsDesc')}</p>
                  </div>
                  <div>
                    <Clock className="h-12 w-12 text-primary mx-auto mb-3" />
                    <div className="text-3xl font-bold mb-2">{t('landing.roi.metrics.timeSaved')}</div>
                    <p className="text-muted-foreground">{t('landing.roi.metrics.timeSavedDesc')}</p>
                  </div>
                  <div>
                    <TrendingUp className="h-12 w-12 text-primary mx-auto mb-3" />
                    <div className="text-3xl font-bold mb-2">{t('landing.roi.metrics.revenue')}</div>
                    <p className="text-muted-foreground">{t('landing.roi.metrics.revenueDesc')}</p>
                  </div>
                </div>

                <div className="mt-8 p-6 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-center text-lg">
                    <span className="font-semibold">{t('landing.roi.example')}</span>{' '}
                    <span className="text-primary font-semibold">{t('landing.roi.exampleHighlight')}</span>.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 md:py-24 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              {t('landing.cta.title')}
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground mb-8">
              {t('landing.cta.subtitle')}
            </p>
            <Link href="/onboarding">
              <Button size="lg" className="text-lg sm:text-xl px-10 sm:px-12 py-6 shadow-2xl shadow-primary/30 group w-full sm:w-auto">
                {t('landing.cta.button')}
                <ChevronRight className="ml-2 h-6 w-6 group-hover:translate-x-2 transition-transform" />
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground mt-6">
              {t('landing.cta.features')}
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 py-12">
        <div className="container mx-auto px-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img
                  src="/val-kira-logo.png"
                  alt="Val Kira CRM"
                  className="h-6 w-auto"
                />
                <span className="font-bold text-lg">{APP_TITLE}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('landing.footer.tagline')}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t('landing.footer.product.title')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#features"><a className="hover:text-foreground">{t('landing.footer.product.features')}</a></Link></li>
                <li><Link href="#pricing"><a className="hover:text-foreground">{t('landing.footer.product.pricing')}</a></Link></li>
                <li><a href="#" className="hover:text-foreground">{t('landing.footer.product.successStories')}</a></li>
                <li><a href="#" className="hover:text-foreground">{t('landing.footer.product.roadmap')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t('landing.footer.support.title')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">{t('landing.footer.support.helpCenter')}</a></li>
                <li><a href="#" className="hover:text-foreground">{t('landing.footer.support.documentation')}</a></li>
                <li><a href="#" className="hover:text-foreground">{t('landing.footer.support.tutorials')}</a></li>
                <li><a href="#" className="hover:text-foreground">{t('landing.footer.support.contact')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t('landing.footer.legal.title')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">{t('landing.footer.legal.terms')}</a></li>
                <li><a href="#" className="hover:text-foreground">{t('landing.footer.legal.privacy')}</a></li>
                <li><a href="#" className="hover:text-foreground">{t('landing.footer.legal.security')}</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2025 {APP_TITLE}. {t('landing.footer.copyright')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
