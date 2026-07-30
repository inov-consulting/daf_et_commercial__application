type LocaleLayoutProps = {
  children: React.ReactNode;
  params: { locale: string };
};

export default function LocaleLayout({ children }: Readonly<LocaleLayoutProps>) {
  return <>{children}</>;
}
