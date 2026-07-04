export interface AppConfigValidator {
  id: string;
  display_name: string;
}

export interface AppConfig {
  id: string;
  validators: {
    offer_validator: AppConfigValidator | null;
    cr_validator: AppConfigValidator | null;
  };
  smtp: {
    host: string;
    port: number;
    username: string;
    use_tls: boolean;
    from_email: string;
    from_name: string;
    password: string;
  };
  updated_at: string;
}

export interface KpiDefinition {
  key: string;
  label: string;
  category: string;
  description: string;
  unit: string;
}

export interface KpiGroupConfig {
  group_id: string;
  group_name: string;
  kpi_keys: string[];
}