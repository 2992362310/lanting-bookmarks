<script setup lang="ts">
defineProps<{
  show: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  type?: "error" | "warning" | "info";
}>();

const emit = defineEmits<{
  (e: "confirm"): void;
  (e: "cancel"): void;
  (e: "update:show", value: boolean): void;
}>();

const handleConfirm = () => {
  emit("confirm");
  emit("update:show", false);
};

const handleCancel = () => {
  emit("cancel");
  emit("update:show", false);
};
</script>

<template>
  <dialog class="modal" :class="{ 'modal-open': show }">
    <div class="modal-box">
      <h3 class="font-bold text-lg" :class="{ 'text-error': type === 'error' }">
        {{ title || "确认操作" }}
      </h3>
      <p class="py-4">{{ message || "您确定要执行此操作吗？" }}</p>
      <div class="modal-action">
        <button class="btn" @click="handleCancel">
          {{ cancelText || "取消" }}
        </button>
        <button
          class="btn"
          :class="type === 'error' ? 'btn-error' : 'btn-primary'"
          @click="handleConfirm"
        >
          {{ confirmText || "确定" }}
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="handleCancel">close</button>
    </form>
  </dialog>
</template>
