/**
 * DOM helpers for field targeting and paste/injection
 * Compatible with React, Angular, Vue forms.
 */
const DomHelper = {
  /**
   * Check if element is editable
   */
  isEditable(el) {
    if (!el) return false;
    const tag = el.tagName?.toLowerCase();
    if (tag === 'input') {
      const type = (el.type || 'text').toLowerCase();
      const editableTypes = ['text', 'email', 'password', 'search', 'tel', 'url', 'number'];
      return editableTypes.includes(type) && !el.readOnly && !el.disabled;
    }
    if (tag === 'textarea') {
      return !el.readOnly && !el.disabled;
    }
    if (el.isContentEditable) {
      return true;
    }
    return false;
  },

  /**
   * Paste text into element, compatible with React/Angular/Vue
   */
  pasteIntoElement(el, text) {
    if (!el || !text) return false;

    const tag = el.tagName?.toLowerCase();

    if (tag === 'input' || tag === 'textarea') {
      // Use native value setter to bypass React's synthetic event system
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value'
      )?.set;
      const nativeTextareaValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype, 'value'
      )?.set;

      const setter = tag === 'textarea' ? nativeTextareaValueSetter : nativeInputValueSetter;
      if (setter) {
        setter.call(el, text);
      } else {
        el.value = text;
      }

      // Dispatch events for React/Angular/Vue
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    } else if (el.isContentEditable) {
      // For contenteditable elements
      el.focus();
      el.innerText = text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    } else {
      return false;
    }

    return true;
  },

  /**
   * Briefly highlight element to give paste feedback
   */
  highlightElement(el, duration = 1500) {
    if (!el) return;
    const orig = el.style.outline;
    const origTransition = el.style.transition;
    el.style.transition = 'outline 0.2s ease';
    el.style.outline = '3px solid #2563eb';
    setTimeout(() => {
      el.style.outline = orig;
      el.style.transition = origTransition;
    }, duration);
  }
};
