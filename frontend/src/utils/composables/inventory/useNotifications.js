import { ref } from "vue";

export function useNotifications() {
  const notification = ref({
    show: false,
    type: "success",
    message: "",
  });

  const showNotification = (message, type = "success") => {
    notification.value = { show: true, type, message };
    setTimeout(() => {
      notification.value.show = false;
    }, 3000);
  };

  const hideNotification = () => {
    notification.value.show = false;
  };

  return {
    notification,
    showNotification,
    hideNotification,
  };
}
