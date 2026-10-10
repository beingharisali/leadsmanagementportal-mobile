import { useState } from "react";
import { Alert, StyleSheet, Switch, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DateTimeField } from "@/components/ui/date-time-field";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { useLeadOptions } from "@/features/customization/hooks";
import type { CustomFieldDefinition, CustomFieldValue } from "@/features/customization/types";
import { ApiClientError, getErrorMessage } from "@/lib/api-client";
import { spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { BUSINESS_TYPES, leadTimelineLabels } from "../config";
import { LEAD_TIMELINES, type Lead, type LeadPayload, type LeadTimeline } from "../types";

/** Form values are what inputs produce (strings, or booleans for yes/no); `toPayload` converts them. */
interface Values {
  businessName: string;
  name: string;
  phone: string;
  email: string;
  businessType: string;
  city: string;
  address: string;
  source: string;
  sourceDetail: string;
  requirement: string;
  budget: string;
  timeline: LeadTimeline | "";
  customFields: Record<string, string | boolean>;
}

function initialValues(lead?: Lead): Values {
  return {
    businessName: lead?.businessName ?? "",
    name: lead?.name ?? "",
    phone: lead?.phone ?? "",
    email: lead?.email ?? "",
    businessType: lead?.businessType ?? "",
    city: lead?.city ?? "",
    address: lead?.address ?? "",
    source: lead?.source ?? "",
    sourceDetail: lead?.sourceDetail ?? "",
    requirement: lead?.requirement ?? "",
    budget: lead?.budget != null ? String(lead.budget) : "",
    timeline: lead?.timeline ?? "",
    customFields: Object.fromEntries(
      Object.entries(lead?.customFields ?? {}).map(([key, value]) => [
        key,
        typeof value === "boolean" ? value : String(value),
      ]),
    ),
  };
}

function toPayload(values: Values): LeadPayload {
  return {
    businessName: values.businessName.trim(),
    name: values.name.trim(),
    phone: values.phone.trim(),
    email: values.email.trim(),
    businessType: values.businessType,
    city: values.city.trim(),
    address: values.address.trim(),
    source: values.source,
    sourceDetail: values.sourceDetail.trim(),
    requirement: values.requirement.trim(),
    budget: values.budget.trim() === "" ? null : Number(values.budget.replace(/,/g, "")),
    timeline: values.timeline === "" ? null : values.timeline,
    customFields: Object.fromEntries(
      Object.entries(values.customFields).map(([key, value]) => [
        key,
        typeof value === "string" ? value.trim() || null : value,
      ]),
    ) as Record<string, CustomFieldValue | null>,
  };
}

/** The same checks as the website, so most mistakes show before saving. */
function validate(values: Values, customFields: CustomFieldDefinition[]) {
  const errors: Record<string, string> = {};
  if (!values.businessName.trim()) errors.businessName = "Business name is required";
  if (values.name.trim().length < 2) errors.name = "Name is required";
  if (values.phone.replace(/\D/g, "").length < 7) errors.phone = "Enter a valid phone number";
  if (values.email.trim() && !/^\S+@\S+\.\S+$/.test(values.email.trim())) errors.email = "Enter a valid email";
  if (!values.source) errors.source = "Source is required";
  if (values.requirement.trim().length < 3) errors.requirement = "Describe what the client needs";
  const budget = values.budget.replace(/,/g, "").trim();
  if (budget && (Number.isNaN(Number(budget)) || Number(budget) < 0)) errors.budget = "Enter a valid amount";
  for (const field of customFields) {
    const value = values.customFields[field.key];
    if (field.required && field.type !== "checkbox" && (value === undefined || String(value).trim() === "")) {
      errors[`customFields.${field.key}`] = `${field.label} is required`;
    }
  }
  return errors;
}

/** "2026-10-06" ↔ a local Date, for date-only custom fields. */
function dayToDate(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
}
function dateToDay(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

interface LeadFormProps {
  lead?: Lead;
  submitLabel: string;
  /** Managers adding a lead can take it themselves */
  allowAssignToMe?: boolean;
  onSubmit: (payload: LeadPayload & { assignToMe?: boolean }) => Promise<unknown>;
}

/** Add or edit a lead: contact, business, requirement, deal and the company's own fields. */
export function LeadForm({ lead, submitLabel, allowAssignToMe, onSubmit }: LeadFormProps) {
  const { colors } = useTheme();
  const { sources, customFields } = useLeadOptions();
  const [values, setValues] = useState(() => initialValues(lead));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [assignToMe, setAssignToMe] = useState(false);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors(({ [key]: _removed, ...rest }) => rest);
  }

  function setCustom(key: string, value: string | boolean) {
    setValues((v) => ({ ...v, customFields: { ...v.customFields, [key]: value } }));
    const path = `customFields.${key}`;
    if (errors[path]) setErrors(({ [path]: _removed, ...rest }) => rest);
  }

  async function submit() {
    const found = validate(values, customFields);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      Alert.alert("Check the form", Object.values(found)[0]);
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ ...toPayload(values), ...(allowAssignToMe && { assignToMe }) });
    } catch (error) {
      // Field problems from the API (duplicate phone, custom field rules) go next to the field.
      const apiErrors =
        error instanceof ApiClientError && error.errors
          ? Object.fromEntries(error.errors.map((e) => [e.path, e.message]))
          : {};
      setErrors(apiErrors);
      Alert.alert("Couldn't save the lead", getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  const err = (path: string) => errors[path];

  return (
    <>
      <Card>
        <AppText variant="heading">Business</AppText>
        <TextField
          label="Business name *"
          value={values.businessName}
          onChangeText={(v) => set("businessName", v)}
          error={err("businessName")}
          maxLength={160}
        />
        <SelectField
          label="Business type"
          value={values.businessType}
          onChange={(v) => set("businessType", v)}
          options={BUSINESS_TYPES.map((type) => ({ value: type, label: type }))}
          clearable
        />
        <TextField label="City" value={values.city} onChangeText={(v) => set("city", v)} maxLength={80} />
        <TextField label="Address" value={values.address} onChangeText={(v) => set("address", v)} maxLength={300} />
      </Card>

      <Card>
        <AppText variant="heading">Contact</AppText>
        <TextField
          label="Contact person *"
          value={values.name}
          onChangeText={(v) => set("name", v)}
          error={err("name")}
          autoCapitalize="words"
          maxLength={120}
        />
        <TextField
          label="Phone *"
          value={values.phone}
          onChangeText={(v) => set("phone", v)}
          error={err("phone")}
          keyboardType="phone-pad"
          placeholder="03xx xxxxxxx"
          maxLength={30}
        />
        <TextField
          label="Email"
          value={values.email}
          onChangeText={(v) => set("email", v)}
          error={err("email")}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </Card>

      <Card>
        <AppText variant="heading">Deal</AppText>
        <SelectField
          label="Source *"
          value={values.source}
          onChange={(v) => set("source", v)}
          options={sources.map((s) => ({ value: s.key, label: s.label }))}
          error={err("source")}
        />
        <TextField
          label="Source detail"
          value={values.sourceDetail}
          onChangeText={(v) => set("sourceDetail", v)}
          placeholder="e.g. Which campaign or who referred them"
          maxLength={160}
        />
        <TextField
          label="Requirement *"
          value={values.requirement}
          onChangeText={(v) => set("requirement", v)}
          error={err("requirement")}
          placeholder="What does the client need?"
          multiline
          maxLength={2000}
          style={styles.multiline}
        />
        <TextField
          label="Budget (PKR)"
          value={values.budget}
          onChangeText={(v) => set("budget", v)}
          error={err("budget")}
          keyboardType="numeric"
        />
        <SelectField
          label="Timeline"
          value={values.timeline}
          onChange={(v) => set("timeline", v as LeadTimeline | "")}
          options={LEAD_TIMELINES.map((t) => ({ value: t, label: leadTimelineLabels[t] }))}
          clearable
        />
      </Card>

      {customFields.length > 0 && (
        <Card>
          <AppText variant="heading">More details</AppText>
          {customFields.map((field) => (
            <CustomFieldInput
              key={field.key}
              field={field}
              value={values.customFields[field.key]}
              onChange={(v) => setCustom(field.key, v)}
              error={err(`customFields.${field.key}`)}
            />
          ))}
        </Card>
      )}

      {allowAssignToMe && (
        <Card style={styles.switchCard}>
          <View style={styles.flex}>
            <AppText variant="label">Assign to me</AppText>
            <AppText variant="small" muted>
              Otherwise it stays unassigned for you to give to an agent.
            </AppText>
          </View>
          <Switch
            value={assignToMe}
            onValueChange={setAssignToMe}
            trackColor={{ true: colors.primary }}
            accessibilityLabel="Assign to me"
          />
        </Card>
      )}

      <Button title={submitLabel} icon="checkmark" loading={saving} onPress={() => void submit()} />
    </>
  );
}

function CustomFieldInput({
  field,
  value,
  onChange,
  error,
}: {
  field: CustomFieldDefinition;
  value: string | boolean | undefined;
  onChange: (value: string | boolean) => void;
  error?: string;
}) {
  const { colors } = useTheme();
  const label = `${field.label}${field.required ? " *" : ""}`;
  const text = typeof value === "string" ? value : "";

  switch (field.type) {
    case "checkbox":
      return (
        <View style={styles.switchRow}>
          <AppText variant="label" style={styles.flex}>
            {field.label}
          </AppText>
          <Switch
            value={value === true}
            onValueChange={onChange}
            trackColor={{ true: colors.primary }}
            accessibilityLabel={field.label}
          />
        </View>
      );
    case "select":
      return (
        <SelectField
          label={label}
          value={text}
          onChange={onChange}
          options={field.options.map((option) => ({ value: option, label: option }))}
          clearable={!field.required}
          error={error}
        />
      );
    case "date":
      return (
        <DateTimeField
          label={label}
          mode="date"
          value={text ? dayToDate(text) : null}
          onChange={(date) => onChange(dateToDay(date))}
          error={error}
        />
      );
    default:
      return (
        <TextField
          label={label}
          value={text}
          onChangeText={onChange}
          error={error}
          keyboardType={field.type === "number" ? "numeric" : "default"}
          multiline={field.type === "textarea"}
          style={field.type === "textarea" ? styles.multiline : undefined}
        />
      );
  }
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  multiline: { minHeight: 96, textAlignVertical: "top" },
  switchCard: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 44 },
});
