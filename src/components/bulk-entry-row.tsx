import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useTheme } from "@/hooks/use-theme";
import { type Category } from "@/lib/categories";

export const MAX_BULK_ROWS = 20;
const INITIAL_BULK_ROWS = 3;
const MIN_BULK_AMOUNT = 1;

export type BulkRow = {
  id: number;
  amount: string;
  category: string;
  note: string;
};

export type BulkRowStatus = "empty" | "valid" | "no-amount";

let nextRowId = 1;

export function newBulkRow(): BulkRow {
  return { id: nextRowId++, amount: "", category: "", note: "" };
}

export function initialBulkRows(): BulkRow[] {
  return Array.from({ length: INITIAL_BULK_ROWS }, newBulkRow);
}

export function parseAmount(text: string): number {
  return parseFloat(text.replace(/,/g, ""));
}

export function sanitizeAmount(text: string): string {
  const cleaned = text.replace(/[^0-9.]/g, "");
  const dot = cleaned.indexOf(".");
  if (dot === -1) return cleaned;
  const decimals = cleaned.slice(dot + 1).replace(/\./g, "").slice(0, 2);
  return `${cleaned.slice(0, dot)}.${decimals}`;
}

export function bulkRowStatus(row: BulkRow): BulkRowStatus {
  if (!row.amount.trim()) return "empty";
  const value = parseAmount(row.amount);
  return isNaN(value) || value < MIN_BULK_AMOUNT ? "no-amount" : "valid";
}

export function BulkEntryRow({
  row,
  category,
  accent,
  canRemove,
  showError,
  focusOnMount,
  onChange,
  onRemove,
  onPickCategory,
  onFocusRow,
  onLayoutY,
}: {
  row: BulkRow;
  category: Category | null;
  accent: string;
  canRemove: boolean;
  showError: boolean;
  focusOnMount: boolean;
  onChange: (id: number, patch: Partial<BulkRow>) => void;
  onRemove: (id: number) => void;
  onPickCategory: (id: number) => void;
  onFocusRow: (id: number) => void;
  onLayoutY: (id: number, y: number) => void;
}) {
  const c = useTheme();
  const amountRef = useRef<TextInput>(null);
  const noteRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState<"amount" | "note" | null>(null);

  useEffect(() => {
    if (!focusOnMount) return;
    const t = setTimeout(() => amountRef.current?.focus(), 150);
    return () => clearTimeout(t);
  }, [focusOnMount]);

  const amountError = showError && bulkRowStatus(row) === "no-amount";

  return (
    <View
      onLayout={(e) => onLayoutY(row.id, e.nativeEvent.layout.y)}
      style={[
        styles.card,
        {
          backgroundColor: c.backgroundSelected,
          borderColor: amountError ? c.danger : c.primary,
        },
      ]}
    >
      <View style={styles.line}>
        <Pressable
          onPress={() => amountRef.current?.focus()}
          style={[
            styles.box,
            styles.amountBox,
            {
              backgroundColor: c.inputBackground,
              borderColor: amountError ? c.danger : c.border,
            },
          ]}
        >
          <Text style={[styles.rupee, { color: accent }]}>₹</Text>
          <TextInput
            ref={amountRef}
            value={row.amount}
            onChangeText={(text) =>
              onChange(row.id, { amount: sanitizeAmount(text) })
            }
            onFocus={() => {
              setFocused("amount");
              onFocusRow(row.id);
            }}
            onBlur={() => setFocused((f) => (f === "amount" ? null : f))}
            placeholder={focused === "amount" ? "" : "0"}
            placeholderTextColor={c.textSecondary}
            keyboardType="numeric"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => noteRef.current?.focus()}
            style={[styles.amountInput, { color: accent }]}
          />
        </Pressable>
        <Pressable
          onPress={() => onPickCategory(row.id)}
          style={[
            styles.box,
            styles.categoryBox,
            { backgroundColor: c.inputBackground, borderColor: c.border },
          ]}
        >
          <Ionicons
            name={category ? category.icon : "pricetag-outline"}
            size={16}
            color={category ? category.color : c.textSecondary}
          />
          <Text
            style={[
              styles.boxText,
              styles.flex,
              { color: category ? c.text : c.textSecondary },
            ]}
            numberOfLines={1}
          >
            {category ? category.name : "Category"}
          </Text>
          <Ionicons name="chevron-down" size={14} color={c.textSecondary} />
        </Pressable>
        {canRemove ? (
          <Pressable
            onPress={() => onRemove(row.id)}
            hitSlop={8}
            style={styles.remove}
          >
            <Ionicons name="close" size={18} color={c.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      <TextInput
        ref={noteRef}
        value={row.note}
        onChangeText={(text) => onChange(row.id, { note: text })}
        onFocus={() => {
          setFocused("note");
          onFocusRow(row.id);
        }}
        onBlur={() => setFocused((f) => (f === "note" ? null : f))}
        placeholder={focused === "note" ? "" : "Note (optional)"}
        placeholderTextColor={c.textSecondary}
        returnKeyType="done"
        style={[
          styles.box,
          styles.noteInput,
          {
            backgroundColor: c.inputBackground,
            borderColor: c.border,
            color: c.text,
          },
        ]}
      />

      {amountError ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={14} color={c.danger} />
          <Text style={[styles.errorText, { color: c.danger }]}>
            Enter ₹{MIN_BULK_AMOUNT} or more
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { borderWidth: 1, borderRadius: 6, padding: 8, gap: 6 },
  line: { flexDirection: "row", alignItems: "center", gap: 6 },
  box: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    height: 40,
  },
  amountBox: { flex: 1 },
  categoryBox: { flex: 1.2 },
  rupee: { fontFamily: "Manrope_700Bold", fontSize: 16 },
  amountInput: {
    flex: 1,
    fontFamily: "Manrope_700Bold",
    fontSize: 16,
    padding: 0,
  },
  boxText: { fontSize: 13, fontFamily: "Manrope_600SemiBold", fontWeight: "600" },
  noteInput: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    paddingVertical: 0,
  },
  remove: { width: 24, alignItems: "center", justifyContent: "center" },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  errorText: { fontFamily: "Manrope_600SemiBold", fontWeight: "600", fontSize: 12 },
});
