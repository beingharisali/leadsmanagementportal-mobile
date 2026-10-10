import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { TextField } from "@/components/ui/text-field";
import { authApi } from "@/features/auth/api";
import { useAuth } from "@/features/auth/auth-provider";
import { ApiClientError, fieldError, getErrorMessage } from "@/lib/api-client";
import { spacing } from "@/theme/colors";

const FIELDS = ["companyName", "name", "email", "phone", "password"] as const;

export default function SignUpScreen() {
  const { signIn } = useAuth();
  const [form, setForm] = useState({ companyName: "", name: "", email: "", phone: "", password: "" });
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const signup = useMutation({
    mutationFn: () =>
      authApi.signup({
        companyName: form.companyName.trim(),
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
      }),
    onSuccess: ({ token }) => signIn(token),
  });

  const error = signup.error;
  // Errors about one field show under it; anything else goes at the top.
  const general =
    error && !(error instanceof ApiClientError && FIELDS.some((f) => fieldError(error, f))) ? getErrorMessage(error) : null;

  return (
    <Screen edges={["left", "right", "bottom"]}>
      <AppText muted>
        Start a free trial for your team. You'll be the owner and can invite your team afterwards.
      </AppText>
      {general && <Banner tone="danger" message={general} />}
      <View style={styles.form}>
        <TextField
          label="Company name"
          value={form.companyName}
          onChangeText={set("companyName")}
          autoCapitalize="words"
          error={fieldError(error, "companyName")}
        />
        <TextField
          label="Your name"
          value={form.name}
          onChangeText={set("name")}
          autoCapitalize="words"
          autoComplete="name"
          error={fieldError(error, "name")}
        />
        <TextField
          label="Email"
          value={form.email}
          onChangeText={set("email")}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          error={fieldError(error, "email")}
        />
        <TextField
          label="Phone (optional)"
          value={form.phone}
          onChangeText={set("phone")}
          keyboardType="phone-pad"
          autoComplete="tel"
          error={fieldError(error, "phone")}
        />
        <TextField
          label="Password"
          value={form.password}
          onChangeText={set("password")}
          password
          autoComplete="new-password"
          textContentType="newPassword"
          hint="At least 8 characters, with a letter and a number."
          error={fieldError(error, "password")}
        />
        <Button title="Create account" onPress={() => signup.mutate()} loading={signup.isPending} />
        <AppText variant="small" muted style={styles.center}>
          We'll email you a link to confirm your address.
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  center: { textAlign: "center" },
});
