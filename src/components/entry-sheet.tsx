import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { CategorySheet } from "@/components/category-sheet";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { touchBook } from "@/lib/books";
import { deleteCategory, useCategories, type Category } from "@/lib/categories";
import { formatTime, shortDate, toISODate } from "@/lib/format";
import {
  createTransaction,
  PAYMENT_METHODS,
  updateTransaction,
  type Transaction,
  type TxType,
} from "@/lib/transactions";

export function EntrySheet({
  visible,
  onClose,
  bookId,
  initialType,
  editing,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  bookId: string;
  initialType: TxType;
  editing?: Transaction | null;
  onSaved: () => void;
}) {
  const c = useTheme();
  const amountRef = useRef<TextInput>(null);
  const categories = useCategories();

  const [type, setType] = useState<TxType>(initialType);
  const [amount, setAmount] = useState("");
  const [when, setWhen] = useState(new Date());
  const [paymentMethod, setPaymentMethod] = useState<string>("Cash");
  const [category, setCategory] = useState("Other");
  const [note, setNote] = useState("");

  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [categorySheet, setCategorySheet] = useState<{
    open: boolean;
    editing: Category | null;
  }>({
    open: false,
    editing: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [toggleW, setToggleW] = useState(0);
  const slide = useRef(
    new Animated.Value(initialType === "credit" ? 0 : 1),
  ).current;
  useEffect(() => {
    Animated.timing(slide, {
      toValue: type === "credit" ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [type, slide]);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setShowDate(false);
    setShowTime(false);
    setCategorySheet({ open: false, editing: null });
    setSaving(false);
    if (editing) {
      setType(editing.type);
      setAmount(String(editing.amount));
      setWhen(new Date(editing.created_at));
      setPaymentMethod(editing.payment_method || "Cash");
      setCategory(editing.category || "Other");
      setNote(editing.note ?? "");
    } else {
      setType(initialType);
      setAmount("");
      setWhen(new Date());
      setPaymentMethod("Cash");
      setCategory("Other");
      setNote("");
    }
    const t = setTimeout(() => amountRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, [visible, editing, initialType]);

  const isCredit = type === "credit";
  const accent = isCredit ? "#16a34a" : "#dc2626";

  const confirmDeleteCategory = (cat: Category) => {
    Alert.alert(
      "Delete Category",
      `Delete "${cat.name}"? Entries already saved under it keep the name, but lose its icon and colour.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCategory(cat.id!);
              if (category === cat.name) setCategory("Other");
            } catch (e) {
              console.error("Delete category failed:", e);
              Alert.alert(
                "Error",
                "Could not delete the category. Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  const onSave = async () => {
    setError(null);
    const value = parseFloat(amount.replace(/,/g, ""));
    if (!amount || isNaN(value) || value <= 0) {
      setError("Please enter an amount greater than 0.");
      return;
    }
    const input = {
      type,
      amount: value,
      entry_date: toISODate(when),
      category,
      note: note.trim() ? note.trim() : null,
      book_id: bookId,
      payment_method: paymentMethod,
      created_at: when.toISOString(),
    };
    setSaving(true);
    try {
      if (editing) await updateTransaction(editing.id, input);
      else await createTransaction(input);
      await touchBook(bookId);
      onSaved();
    } catch (e: any) {
      const msg = String(e?.message ?? "").toLowerCase();
      console.error("Save entry failed:", e);
      setError(
        msg.includes("network") || msg.includes("fetch")
          ? "No internet connection. Please try again."
          : "Could not save. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const saveButton = (
    <Button
      title={
        editing ? "Save Changes" : isCredit ? "Save Cash In" : "Save Cash Out"
      }
      onPress={onSave}
      loading={saving}
      variant={isCredit ? "primary" : "danger"}
      style={{ backgroundColor: accent, height: 52, borderRadius: 12 }}
    />
  );

  return (
    <>
      <BottomSheet
        visible={visible}
        onClose={onClose}
        title={editing ? "Edit Entry" : isCredit ? "Cash In" : "Cash Out"}
        footer={saveButton}
      >
        {/* In / Out type toggle with animated sliding pill (Fix 1) */}
        <View
          style={styles.toggle}
          onLayout={(e) => setToggleW(e.nativeEvent.layout.width)}
        >
          <Animated.View
            style={[
              styles.togglePill,
              {
                width: toggleW > 0 ? (toggleW - 8) / 2 : 0,
                backgroundColor: accent,
                shadowColor: accent,
                transform: [
                  {
                    translateX: slide.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, toggleW > 0 ? (toggleW - 8) / 2 : 0],
                    }),
                  },
                ],
              },
            ]}
          />
          <Pressable
            style={styles.toggleHalf}
            onPress={() => setType("credit")}
          >
            <Text
              style={[
                styles.toggleText,
                { color: isCredit ? "#fff" : "#94a3b8" },
              ]}
            >
              + Cash In
            </Text>
          </Pressable>
          <Pressable style={styles.toggleHalf} onPress={() => setType("debit")}>
            <Text
              style={[
                styles.toggleText,
                { color: !isCredit ? "#fff" : "#94a3b8" },
              ]}
            >
              − Cash Out
            </Text>
          </Pressable>
        </View>

        {/* Amount — tapping anywhere in this row focuses the input  */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => amountRef.current?.focus()}
          style={styles.amountTouch}
        >
          <View style={styles.amountRow}>
            <Text style={[styles.rupee, { color: accent }]}>₹</Text>
            <TextInput
              ref={amountRef}
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor="#ccc"
              keyboardType="numeric"
              style={[styles.amountInput, { color: accent }]}
              autoFocus
            />
          </View>
        </TouchableOpacity>

        {/* Date + Time row — each 50%*/}
        <View style={styles.row}>
          <Pressable
            onPress={() => setShowDate(true)}
            style={[
              styles.field,
              styles.half,
              { backgroundColor: c.inputBackground, borderColor: c.border },
            ]}
          >
            <Ionicons name="calendar" size={16} color={c.textSecondary} />
            <Text style={[styles.fieldText, { color: c.text }]}>
              {shortDate(when)}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setShowTime(true)}
            style={[
              styles.field,
              styles.half,
              { backgroundColor: c.inputBackground, borderColor: c.border },
            ]}
          >
            <Ionicons name="time" size={16} color={c.textSecondary} />
            <Text style={[styles.fieldText, { color: c.text }]}>
              {formatTime(when)}
            </Text>
          </Pressable>
        </View>
        {showDate && (
          <DateTimePicker
            value={when}
            mode="date"
            maximumDate={new Date(2100, 0, 1)}
            display={Platform.OS === "ios" ? "inline" : "default"}
            onChange={(e, selected) => {
              if (Platform.OS !== "ios") setShowDate(false);
              if (e.type === "set" && selected) {
                const next = new Date(when);
                next.setFullYear(
                  selected.getFullYear(),
                  selected.getMonth(),
                  selected.getDate(),
                );
                setWhen(next);
              }
            }}
          />
        )}
        {showTime && (
          <DateTimePicker
            value={when}
            mode="time"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(e, selected) => {
              if (Platform.OS !== "ios") setShowTime(false);
              if (e.type === "set" && selected) {
                const next = new Date(when);
                next.setHours(selected.getHours(), selected.getMinutes());
                setWhen(next);
              }
            }}
          />
        )}
        {Platform.OS === "ios" && (showDate || showTime) ? (
          <Button
            title="Done"
            variant="secondary"
            onPress={() => {
              setShowDate(false);
              setShowTime(false);
            }}
          />
        ) : null}

        {/* Payment method pills */}
        <Text style={[styles.label, { color: "#666" }]}>Payment method</Text>
        <View style={styles.pills}>
          {PAYMENT_METHODS.map((pm) => {
            const active = paymentMethod === pm;
            return (
              <Pressable
                key={pm}
                onPress={() => setPaymentMethod(pm)}
                style={[
                  styles.pill,
                  active
                    ? { backgroundColor: "#2563eb", borderColor: "#2563eb" }
                    : {
                        backgroundColor: c.inputBackground,
                        borderColor: "#e5e7eb",
                      },
                ]}
              >
                <Text
                  style={{
                    color: active ? "#fff" : c.text,
                    fontWeight: "600",
                    fontSize: 14,
                  }}
                >
                  {pm}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { color: "#666" }]}>Category</Text>
        <View style={styles.catGrid}>
          {categories.map((cat) => {
            const active = category === cat.name;
            return (
              <Pressable
                key={cat.id ?? cat.name}
                onPress={() => setCategory(cat.name)}
                style={[
                  styles.catChip,
                  active
                    ? { backgroundColor: "#eff6ff", borderColor: "#2563eb" }
                    : {
                        backgroundColor: c.inputBackground,
                        borderColor: "#e5e7eb",
                      },
                ]}
              >
                {cat.id ? (
                  <>
                    <Pressable
                      onPress={() =>
                        setCategorySheet({ open: true, editing: cat })
                      }
                      hitSlop={6}
                      style={[styles.catBadge, styles.catBadgeRight]}
                    >
                      <Ionicons
                        name="pencil"
                        size={11}
                        color={c.textSecondary}
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => confirmDeleteCategory(cat)}
                      hitSlop={6}
                      style={[styles.catBadge, styles.catBadgeLeft]}
                    >
                      <Ionicons name="trash" size={11} color="#dc2626" />
                    </Pressable>
                  </>
                ) : null}
                <Ionicons name={cat.icon} size={20} color={cat.color} />
                <Text
                  style={[
                    styles.catText,
                    { color: active ? "#2563eb" : c.text },
                  ]}
                  numberOfLines={1}
                >
                  {cat.name}
                </Text>
              </Pressable>
            );
          })}

          {category && !categories.some((cat) => cat.name === category) ? (
            <Pressable
              style={[
                styles.catChip,
                { backgroundColor: "#eff6ff", borderColor: "#2563eb" },
              ]}
            >
              <Ionicons name="pricetag" size={20} color="#6B7280" />
              <Text
                style={[styles.catText, { color: "#2563eb" }]}
                numberOfLines={1}
              >
                {category}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <Pressable
          onPress={() => setCategorySheet({ open: true, editing: null })}
          style={({ pressed }) => [
            styles.addCatButton,
            pressed && { opacity: 0.6 },
          ]}
        >
          <Ionicons name="add-circle" size={18} color="#2563eb" />
          <Text style={styles.addCatText}>Add category</Text>
        </Pressable>

        {/* Note */}
        <Text style={[styles.label, { color: "#666" }]}>Note (optional)</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="e.g. Airtel recharge"
          placeholderTextColor={c.textSecondary}
          style={[
            styles.noteInput,
            {
              backgroundColor: c.inputBackground,
              borderColor: "#e5e7eb",
              color: c.text,
            },
          ]}
          multiline
        />

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: c.dangerSoft }]}>
            <Ionicons name="alert-circle" size={18} color={c.danger} />
            <Text style={[styles.errorText, { color: c.danger }]}>{error}</Text>
          </View>
        ) : null}
      </BottomSheet>

      <CategorySheet
        visible={categorySheet.open}
        editing={categorySheet.editing}
        onClose={() => setCategorySheet({ open: false, editing: null })}
        onSaved={(saved) => setCategory(saved.name)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  toggle: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 14,
    padding: 4,
    height: 52,
  },
  togglePill: {
    position: "absolute",
    left: 4,
    top: 4,
    height: 44,
    borderRadius: 11,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleHalf: { flex: 1, alignItems: "center", justifyContent: "center" },
  toggleText: { fontSize: 15, fontWeight: "700" },
  amountTouch: { width: "100%", alignItems: "center", paddingVertical: 12 },
  amountRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  rupee: { fontSize: 28, fontWeight: "bold" },
  amountInput: {
    fontSize: 40,
    fontWeight: "bold",
    textAlign: "center",
    padding: 0,
    minWidth: 70,
  },
  row: { flexDirection: "row", gap: 8 },
  half: { width: "50%", flex: 1 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  fieldText: { fontSize: 14, fontWeight: "600" },
  label: { fontSize: 12, fontWeight: "600", marginTop: 8, marginBottom: 4 },
  pills: { flexDirection: "row", gap: 6 },
  pill: {
    flex: 1,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  catChip: {
    width: "23.5%",
    height: 66,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  catBadge: {
    position: "absolute",
    top: 3,
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
  },
  catBadgeLeft: { left: 3 },
  catBadgeRight: { right: 3 },
  addCatButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    alignSelf: "flex-start",
    marginTop: 12,
    marginBottom: 4,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
  },
  addCatText: { fontSize: 14, fontWeight: "700", color: "#2563eb" },
  catText: { fontSize: 11, fontWeight: "600" },
  noteInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    height: 36,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  errorText: { flex: 1, fontSize: 13 },
});
