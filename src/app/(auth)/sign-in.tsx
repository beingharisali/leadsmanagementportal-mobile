import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { useRef, useState } from "react";
import { StyleSheet, View, type TextInput } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { TextField } from "@/components/ui/text-field";
import { authApi, type SignInResult } from "@/features/auth/api";
import { useAuth } from "@/features/auth/auth-provider";
import { fieldError, getErrorMessage } from "@/lib/api-client";
import { spacing } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

export default function SignInScreen() {
  const { colors } = useTheme();
  const { signIn, signedOutReason } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const passwordRef = useRef<TextInput>(null);

  const finish = ({ token }: SignInResult) => signIn(token);
  const login = useMutation({
    mutationFn: () => authApi.login({ email: email.trim(), password }),
    onSuccess: finish,
  });
  const demo = useMutation({ mutationFn: authApi.demoSignIn, onSuccess: finish });
  const demoStatus = useQuery({ queryKey: ["demo-status"], queryFn: authApi.demoStatus });

  const busy = login.isPending || demo.isPending;
  const error = login.error ?? demo.error;

  return (
    <Screen edges={["top", "left", "right", "bottom"]}>
      <View style={styles.header}>
        <AppText variant="title" color={colors.primary}>
          GetCloseWise
        </AppText>
        <AppText muted>Sign in to your company's workspace</AppText>
      </View>

      {signedOutReason && !error && <Banner tone="warning" message={signedOutReason} />}
      {error && !fieldError(error, "email") && !fieldError(error, "password") && (
        <Banner tone="danger" message={getErrorMessage(error)} />
      )}

      <View style={styles.form}>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@company.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          error={fieldError(login.error, "email")}
        />
        <TextField
          ref={passwordRef}
          label="Password"
          value={password}
          onChangeText={setPassword}
          password
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={() => login.mutate()}
          error={fieldError(login.error, "password")}
        />
        <Button title="Sign in" onPress={() => login.mutate()} loading={login.isPending} disabled={busy} />
        <Link href="/forgot-password" style={[styles.link, { color: colors.primary }]}>
          Forgot your password?
        </Link>
      </View>

      {demoStatus.data?.enabled && (
        <Card>
          <AppText variant="label" weight="600">
            Just looking around?
          </AppText>
          <AppText variant="small" muted>
            Try a ready-made demo company. Nothing you do there is kept.
          </AppText>
          <View style={styles.row}>
            <Button
              title="Try as admin"
              variant="secondary"
              style={styles.flex}
              onPress={() => demo.mutate("admin")}
              loading={demo.isPending && demo.variables === "admin"}
              disabled={busy}
            />
            <Button
              title="Try as agent"
              variant="secondary"
              style={styles.flex}
              onPress={() => demo.mutate("agent")}
              loading={demo.isPending && demo.variables === "agent"}
              disabled={busy}
            />
          </View>
        </Card>
      )}

      <View style={styles.footer}>
        <AppText muted>New to GetCloseWise?</AppText>
        <Link href="/sign-up" style={[styles.link, { color: colors.primary }]}>
          Create a company account
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs, paddingTop: spacing.xxl, paddingBottom: spacing.sm },
  form: { gap: spacing.lg },
  link: { fontSize: 15, fontWeight: "600", textAlign: "center", paddingVertical: spacing.xs },
  row: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  flex: { flex: 1 },
  footer: { alignItems: "center", gap: spacing.xs, marginTop: "auto", paddingBottom: spacing.lg },
});
