// ./public/js/formsubmits-embed.js
/**
 * FormSubmits Embed Library
 * Version: 1.0.0
 *
 * Automatically generates and embeds HTML forms from FormSubmits configuration.
 *
 * Usage (Automatic):
 *   <div id="my-form"></div>
 *   <script
 *     src="https://cdn.formsubmits.com/formsubmits-embed.js"
 *     data-form-path="your-form-id"
 *     data-container="my-form"
 *     data-theme="default"
 *   ></script>
 *
 * Usage (Programmatic):
 *   const html = await FormSubmitsEmbed.generateHtml('your-form-id', { theme: 'bootstrap5' });
 *   // or
 *   await FormSubmitsEmbed.embed('your-form-id', 'my-form', { theme: 'tailwind' });
 *
 * @author FormSubmits
 * @license MIT
 */

(function (window) {
  'use strict';

  // ============================================================================
  // Constants
  // ============================================================================

  var VERSION = '1.0.0';
  var DEFAULT_API_URL = 'https://api.formsubmits.com';
  var INDENT = '  '; // 2 spaces for indentation

  // Field type IDs (must match backend FIELD_TYPE_IDS)
  var FIELD_TYPES = {
    SHORT_TEXT: 0,
    NUMBER: 10,
    DATE: 20,
    TIME: 30,
    DATETIME: 40,
    PHONE: 50,
    EMAIL: 60,
    BOOLEAN: 70,
    REGULAR_EXPRESSION: 80,
    MULTIPLE_CHOICE: 90,
    LONG_TEXT: 100,
    URL: 110,
    UUID: 120,
    HEX_COLOR: 130,
    BIRTHDATE: 140,
    BIRTHDAY: 150,
    PASSWORD: 160,
    USERNAME: 170,
    SLUG: 180,
    COORDINATES: 190,
    CREDIT_CARD: 200,
    LOOKUP: 500,
    FILE: 1000,
    ANTISPAMBOT: 10000,
    RECAPTCHA2: 10102,
    RECAPTCHA3: 10103,
    RECAPTCHA_ENTERPRISE: 10104,
  };

  // Theme configurations
  var THEMES = {
    default: {
      form: 'fs-form',
      formGroup: 'fs-form-group',
      label: 'fs-label',
      input: 'fs-input',
      textarea: 'fs-textarea',
      select: 'fs-select',
      checkbox: 'fs-checkbox',
      checkboxGroup: 'fs-checkbox-group',
      checkboxLabel: 'fs-checkbox-label',
      radio: 'fs-radio',
      radioGroup: 'fs-radio-group',
      radioLabel: 'fs-radio-label',
      button: 'fs-button',
      errorSummary: 'fs-error-summary',
      errorSummaryList: 'fs-error-summary-list',
      errorText: 'fs-error-text',
      successMessage: 'fs-success-message',
      successMessageText: 'fs-success-message-text',
      honeypot: 'fs-honeypot',
      required: 'fs-required',
      fileInput: 'fs-file-input',
      description: 'fs-description',
    },
    bootstrap5: {
      form: '',
      formGroup: 'mb-3',
      label: 'form-label',
      input: 'form-control',
      textarea: 'form-control',
      select: 'form-select',
      checkbox: 'form-check-input',
      checkboxGroup: 'form-check',
      checkboxLabel: 'form-check-label',
      radio: 'form-check-input',
      radioGroup: 'form-check',
      radioLabel: 'form-check-label',
      button: 'btn btn-primary',
      errorSummary: 'alert alert-danger',
      errorSummaryList: 'mb-0',
      errorText: 'invalid-feedback',
      successMessage: 'alert alert-success',
      successMessageText: '',
      honeypot: 'd-none',
      required: 'text-danger',
      fileInput: 'form-control',
      description: 'form-text text-muted',
    },
    tailwind: {
      form: '',
      formGroup: 'mb-4',
      label: 'block text-sm font-medium text-gray-700 mb-1',
      input:
        'block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
      textarea:
        'block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
      select:
        'block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
      checkbox: 'h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500',
      checkboxGroup: 'flex items-center',
      checkboxLabel: 'ml-2 block text-sm text-gray-900',
      radio: 'h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500',
      radioGroup: 'flex items-center',
      radioLabel: 'ml-2 block text-sm text-gray-900',
      button:
        'inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
      errorSummary: 'rounded-md bg-red-50 p-4 mb-4',
      errorSummaryList: 'list-disc list-inside text-sm text-red-700',
      errorText: 'mt-1 text-sm text-red-600',
      successMessage: 'rounded-md bg-green-50 p-4 mb-4',
      successMessageText: 'text-sm text-green-700',
      honeypot: 'hidden',
      required: 'text-red-500',
      fileInput:
        'block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100',
      description: 'mt-1 text-sm text-gray-500',
    },
    none: {
      form: '',
      formGroup: '',
      label: '',
      input: '',
      textarea: '',
      select: '',
      checkbox: '',
      checkboxGroup: '',
      checkboxLabel: '',
      radio: '',
      radioGroup: '',
      radioLabel: '',
      button: '',
      errorSummary: 'error-summary',
      errorSummaryList: '',
      errorText: '',
      successMessage: 'success-message',
      successMessageText: '',
      honeypot: '',
      required: '',
      fileInput: '',
      description: '',
    },
  };

  // Default CSS for 'default' theme
  var DEFAULT_STYLES = [
    '.fs-form {',
    '  max-width: 600px;',
    "  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;",
    '}',
    '',
    '.fs-form-group {',
    '  margin-bottom: 1rem;',
    '}',
    '',
    '.fs-label {',
    '  display: block;',
    '  margin-bottom: 0.375rem;',
    '  font-weight: 500;',
    '  color: #374151;',
    '  font-size: 0.875rem;',
    '}',
    '',
    '.fs-input,',
    '.fs-textarea,',
    '.fs-select,',
    '.fs-file-input {',
    '  display: block;',
    '  width: 100%;',
    '  padding: 0.5rem 0.75rem;',
    '  font-size: 1rem;',
    '  line-height: 1.5;',
    '  color: #1f2937;',
    '  background-color: #fff;',
    '  border: 1px solid #d1d5db;',
    '  border-radius: 0.375rem;',
    '  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;',
    '  box-sizing: border-box;',
    '}',
    '',
    '.fs-input:focus,',
    '.fs-textarea:focus,',
    '.fs-select:focus {',
    '  outline: none;',
    '  border-color: #6366f1;',
    '  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);',
    '}',
    '',
    '.fs-input.is-invalid,',
    '.fs-textarea.is-invalid,',
    '.fs-select.is-invalid {',
    '  border-color: #ef4444;',
    '}',
    '',
    '.fs-textarea {',
    '  min-height: 100px;',
    '  resize: vertical;',
    '}',
    '',
    '.fs-checkbox-group {',
    '  display: flex;',
    '  align-items: center;',
    '  margin-bottom: 0.5rem;',
    '}',
    '',
    '.fs-checkbox {',
    '  margin-right: 0.5rem;',
    '}',
    '',
    '.fs-checkbox-label {',
    '  font-size: 0.875rem;',
    '  color: #374151;',
    '  cursor: pointer;',
    '}',
    '',
    '.fs-button {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  padding: 0.625rem 1.25rem;',
    '  font-size: 1rem;',
    '  font-weight: 500;',
    '  color: #fff;',
    '  background-color: #6366f1;',
    '  border: none;',
    '  border-radius: 0.375rem;',
    '  cursor: pointer;',
    '  transition: background-color 0.15s ease-in-out;',
    '}',
    '',
    '.fs-button:hover {',
    '  background-color: #4f46e5;',
    '}',
    '',
    '.fs-button:disabled {',
    '  background-color: #9ca3af;',
    '  cursor: not-allowed;',
    '}',
    '',
    '.fs-button .spinner {',
    '  display: none;',
    '  width: 1rem;',
    '  height: 1rem;',
    '  margin-right: 0.5rem;',
    '  border: 2px solid #fff;',
    '  border-top-color: transparent;',
    '  border-radius: 50%;',
    '  animation: fs-spin 0.6s linear infinite;',
    '}',
    '',
    '.fs-button.loading .spinner {',
    '  display: inline-block;',
    '}',
    '',
    '@keyframes fs-spin {',
    '  to { transform: rotate(360deg); }',
    '}',
    '',
    '.fs-error-summary {',
    '  background-color: #fef2f2;',
    '  border: 1px solid #fecaca;',
    '  border-radius: 0.375rem;',
    '  padding: 1rem;',
    '  margin-bottom: 1rem;',
    '  display: none;',
    '}',
    '',
    '.fs-error-summary.hide {',
    '  display: none;',
    '}',
    '.fs-error-summary.show {',
    '  display: block;',
    '}',
    '',
    '.fs-error-summary-list {',
    '  margin: 0;',
    '  padding-left: 1.25rem;',
    '  color: #dc2626;',
    '  font-size: 0.875rem;',
    '}',
    '',
    '.fs-error-text {',
    '  color: #dc2626;',
    '  font-size: 0.75rem;',
    '  margin-top: 0.25rem;',
    '  display: none;',
    '}',
    '',
    '.fs-error-text.show {',
    '  display: block;',
    '}',
    '',
    '.fs-success-message {',
    '  background-color: #f0fdf4;',
    '  border: 1px solid #bbf7d0;',
    '  border-radius: 0.375rem;',
    '  padding: 1rem;',
    '  margin-bottom: 1rem;',
    '  display: none;',
    '}',
    '',
    '.fs-success-message.hide {',
    '  display: none',
    '}',
    '.fs-success-message.show {',
    '  display: block',
    '}',
    '',
    '.fs-success-message-text {',
    '  color: #166534;',
    '  font-size: 0.875rem;',
    '}',
    '',
    '.fs-honeypot {',
    '  position: absolute;',
    '  left: -9999px;',
    '  top: -9999px;',
    '  opacity: 0;',
    '  height: 0;',
    '  width: 0;',
    '  z-index: -1;',
    '  pointer-events: none;',
    '}',
    '',
    '.fs-required {',
    '  color: #dc2626;',
    '  margin-left: 0.125rem;',
    '}',
    '',
    '.fs-description {',
    '  font-size: 0.75rem;',
    '  color: #6b7280;',
    '  margin-top: 0.25rem;',
    '}',
  ].join('\n');

  // ============================================================================
  // Utility Functions
  // ============================================================================

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(text) {
    if (!text) return '';
    var map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return String(text).replace(/[&<>"']/g, function (m) {
      return map[m];
    });
  }

  /**
   * Parse JSON safely
   */
  function parseJson(str, defaultValue) {
    if (!str) return defaultValue;
    try {
      return JSON.parse(str);
    } catch (e) {
      return defaultValue;
    }
  }

  /**
   * Generate a unique ID
   */
  function generateId(prefix) {
    return (prefix || 'fs') + '-' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Add class attribute if classes exist
   */
  function classAttr(classes) {
    if (!classes || classes.trim() === '') return '';
    return ' class="' + escapeHtml(classes) + '"';
  }

  /**
   * Create indentation string
   */
  function indent(level) {
    var result = '';
    for (var i = 0; i < level; i++) {
      result += INDENT;
    }
    return result;
  }

  // ============================================================================
  // Field Renderers
  // ============================================================================

  /**
   * Render a text input field
   */
  function renderTextInput(field, theme, inputType, indentLevel) {
    inputType = inputType || 'text';
    indentLevel = indentLevel || 0;
    var ind = indent(indentLevel);
    var ind1 = indent(indentLevel + 1);

    var id = generateId(field.name);
    var required = field.required ? ' required' : '';
    var minLength = field.minValue ? ' minlength="' + field.minValue + '"' : '';
    var maxLength = field.maxValue ? ' maxlength="' + field.maxValue + '"' : '';
    var defaultValue = field.defaultValue ? ' value="' + escapeHtml(field.defaultValue) + '"' : '';
    var placeholder = field.label ? ' placeholder="' + escapeHtml(field.label) + '"' : '';

    var lines = [];
    lines.push(ind + '<div' + classAttr(theme.formGroup) + '>');
    lines.push(renderLabel(field, theme, id, indentLevel + 1));
    lines.push(
      ind1 +
        '<input type="' +
        inputType +
        '" id="' +
        id +
        '" name="' +
        escapeHtml(field.name) +
        '"' +
        classAttr(theme.input) +
        required +
        minLength +
        maxLength +
        defaultValue +
        placeholder +
        '>',
    );
    lines.push(renderFieldError(field, theme, indentLevel + 1));
    lines.push(ind + '</div>');

    return lines
      .filter(function (line) {
        return line !== '';
      })
      .join('\n');
  }

  /**
   * Render a number input field
   */
  function renderNumberInput(field, theme, indentLevel) {
    indentLevel = indentLevel || 0;
    var ind = indent(indentLevel);
    var ind1 = indent(indentLevel + 1);

    var id = generateId(field.name);
    var required = field.required ? ' required' : '';
    var min = field.minValue != null ? ' min="' + field.minValue + '"' : '';
    var max = field.maxValue != null ? ' max="' + field.maxValue + '"' : '';
    var defaultValue = field.defaultValue ? ' value="' + escapeHtml(field.defaultValue) + '"' : '';

    var options = parseJson(field.options, {});
    var step = options.decimal ? ' step="0.01"' : '';

    var lines = [];
    lines.push(ind + '<div' + classAttr(theme.formGroup) + '>');
    lines.push(renderLabel(field, theme, id, indentLevel + 1));
    lines.push(
      ind1 +
        '<input type="number" id="' +
        id +
        '" name="' +
        escapeHtml(field.name) +
        '"' +
        classAttr(theme.input) +
        required +
        min +
        max +
        step +
        defaultValue +
        '>',
    );
    lines.push(renderFieldError(field, theme, indentLevel + 1));
    lines.push(ind + '</div>');

    return lines
      .filter(function (line) {
        return line !== '';
      })
      .join('\n');
  }

  /**
   * Render a textarea field
   */
  function renderTextarea(field, theme, indentLevel) {
    indentLevel = indentLevel || 0;
    var ind = indent(indentLevel);
    var ind1 = indent(indentLevel + 1);

    var id = generateId(field.name);
    var required = field.required ? ' required' : '';
    var minLength = field.minValue ? ' minlength="' + field.minValue + '"' : '';
    var maxLength = field.maxValue ? ' maxlength="' + field.maxValue + '"' : '';
    var defaultValue = field.defaultValue ? escapeHtml(field.defaultValue) : '';
    var placeholder = field.label ? ' placeholder="' + escapeHtml(field.label) + '"' : '';

    var lines = [];
    lines.push(ind + '<div' + classAttr(theme.formGroup) + '>');
    lines.push(renderLabel(field, theme, id, indentLevel + 1));
    lines.push(
      ind1 +
        '<textarea id="' +
        id +
        '" name="' +
        escapeHtml(field.name) +
        '"' +
        classAttr(theme.textarea) +
        required +
        minLength +
        maxLength +
        placeholder +
        '>' +
        defaultValue +
        '</textarea>',
    );
    lines.push(renderFieldError(field, theme, indentLevel + 1));
    lines.push(ind + '</div>');

    return lines
      .filter(function (line) {
        return line !== '';
      })
      .join('\n');
  }

  /**
   * Render a select dropdown
   */
  function renderSelect(field, theme, indentLevel) {
    indentLevel = indentLevel || 0;
    var ind = indent(indentLevel);
    var ind1 = indent(indentLevel + 1);
    var ind2 = indent(indentLevel + 2);

    var id = generateId(field.name);
    var required = field.required ? ' required' : '';
    var options = parseJson(field.options, []);
    var values = Array.isArray(options) ? options : options.values || [];

    var lines = [];
    lines.push(ind + '<div' + classAttr(theme.formGroup) + '>');
    lines.push(renderLabel(field, theme, id, indentLevel + 1));
    lines.push(
      ind1 + '<select id="' + id + '" name="' + escapeHtml(field.name) + '"' + classAttr(theme.select) + required + '>',
    );
    lines.push(ind2 + '<option value="">-- Select --</option>');

    for (var i = 0; i < values.length; i++) {
      var opt = values[i];
      var optValue = typeof opt === 'object' ? opt.value : opt;
      var optLabel = typeof opt === 'object' ? opt.label || opt.value : opt;
      var selected = field.defaultValue === optValue ? ' selected' : '';
      lines.push(
        ind2 + '<option value="' + escapeHtml(optValue) + '"' + selected + '>' + escapeHtml(optLabel) + '</option>',
      );
    }

    lines.push(ind1 + '</select>');
    lines.push(renderFieldError(field, theme, indentLevel + 1));
    lines.push(ind + '</div>');

    return lines
      .filter(function (line) {
        return line !== '';
      })
      .join('\n');
  }

  /**
   * Render multiple choice checkboxes
   */
  function renderMultipleChoice(field, theme, indentLevel) {
    indentLevel = indentLevel || 0;
    var ind = indent(indentLevel);
    var ind1 = indent(indentLevel + 1);
    var ind2 = indent(indentLevel + 2);

    var options = parseJson(field.options, []);
    var values = Array.isArray(options) ? options : options.values || [];
    var defaultValues = field.defaultValue
      ? field.defaultValue.split(',').map(function (v) {
          return v.trim();
        })
      : [];

    var lines = [];
    lines.push(ind + '<div' + classAttr(theme.formGroup) + '>');
    lines.push(renderLabel(field, theme, null, indentLevel + 1));

    for (var i = 0; i < values.length; i++) {
      var opt = values[i];
      var optValue = typeof opt === 'object' ? opt.value : opt;
      var optLabel = typeof opt === 'object' ? opt.label || opt.value : opt;
      var id = generateId(field.name + '-' + i);
      var checked = defaultValues.indexOf(optValue) !== -1 ? ' checked' : '';

      lines.push(ind1 + '<div' + classAttr(theme.checkboxGroup) + '>');
      lines.push(
        ind2 +
          '<input type="checkbox" id="' +
          id +
          '" name="' +
          escapeHtml(field.name) +
          '" value="' +
          escapeHtml(optValue) +
          '"' +
          classAttr(theme.checkbox) +
          checked +
          '>',
      );
      lines.push(
        ind2 + '<label for="' + id + '"' + classAttr(theme.checkboxLabel) + '>' + escapeHtml(optLabel) + '</label>',
      );
      lines.push(ind1 + '</div>');
    }

    lines.push(renderFieldError(field, theme, indentLevel + 1));
    lines.push(ind + '</div>');

    return lines
      .filter(function (line) {
        return line !== '';
      })
      .join('\n');
  }

  /**
   * Render a single checkbox (boolean)
   */
  function renderCheckbox(field, theme, indentLevel) {
    indentLevel = indentLevel || 0;
    var ind = indent(indentLevel);
    var ind1 = indent(indentLevel + 1);
    var ind2 = indent(indentLevel + 2);

    var id = generateId(field.name);
    var required = field.required ? ' required' : '';
    var checked = field.defaultValue === 'true' || field.defaultValue === '1' ? ' checked' : '';

    var labelText = escapeHtml(field.label || field.name);
    if (field.required) {
      labelText += '<span' + classAttr(theme.required) + '>*</span>';
    }

    var lines = [];
    lines.push(ind + '<div' + classAttr(theme.formGroup) + '>');
    lines.push(ind1 + '<div' + classAttr(theme.checkboxGroup) + '>');
    lines.push(
      ind2 +
        '<input type="checkbox" id="' +
        id +
        '" name="' +
        escapeHtml(field.name) +
        '" value="true"' +
        classAttr(theme.checkbox) +
        required +
        checked +
        '>',
    );
    lines.push(ind2 + '<label for="' + id + '"' + classAttr(theme.checkboxLabel) + '>' + labelText + '</label>');
    lines.push(ind1 + '</div>');
    lines.push(renderFieldError(field, theme, indentLevel + 1));
    lines.push(ind + '</div>');

    return lines
      .filter(function (line) {
        return line !== '';
      })
      .join('\n');
  }

  /**
   * Render a file input
   */
  function renderFileInput(field, theme, indentLevel) {
    indentLevel = indentLevel || 0;
    var ind = indent(indentLevel);
    var ind1 = indent(indentLevel + 1);

    var id = generateId(field.name);
    var required = field.required ? ' required' : '';
    var options = parseJson(field.options, {});

    var accept = '';
    if (options.extensions && Array.isArray(options.extensions)) {
      accept =
        ' accept="' +
        options.extensions
          .map(function (ext) {
            return ext.startsWith('.') ? ext : '.' + ext;
          })
          .join(',') +
        '"';
    }

    var multiple = '';
    if (options.maxFiles && options.maxFiles > 1) {
      multiple = ' multiple';
    }

    var lines = [];
    lines.push(ind + '<div' + classAttr(theme.formGroup) + '>');
    lines.push(renderLabel(field, theme, id, indentLevel + 1));
    lines.push(
      ind1 +
        '<input type="file" id="' +
        id +
        '" name="' +
        escapeHtml(field.name) +
        '"' +
        classAttr(theme.fileInput) +
        required +
        accept +
        multiple +
        '>',
    );
    lines.push(renderFieldError(field, theme, indentLevel + 1));
    lines.push(ind + '</div>');

    return lines
      .filter(function (line) {
        return line !== '';
      })
      .join('\n');
  }

  /**
   * Render birthday field (month/day selectors)
   */
  function renderBirthday(field, theme, indentLevel) {
    indentLevel = indentLevel || 0;
    var ind = indent(indentLevel);
    var ind1 = indent(indentLevel + 1);
    var ind2 = indent(indentLevel + 2);
    var ind3 = indent(indentLevel + 3);

    var id = generateId(field.name);
    var required = field.required ? ' required' : '';

    var months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    var lines = [];
    lines.push(ind + '<div' + classAttr(theme.formGroup) + '>');
    lines.push(renderLabel(field, theme, id, indentLevel + 1));
    lines.push(ind1 + '<div style="display: flex; gap: 0.5rem;">');

    // Month select
    lines.push(
      ind2 +
        '<select id="' +
        id +
        '-month" name="' +
        escapeHtml(field.name) +
        '_month"' +
        classAttr(theme.select) +
        required +
        ' style="flex: 1;">',
    );
    lines.push(ind3 + '<option value="">Month</option>');
    for (var i = 0; i < 12; i++) {
      var monthVal = String(i + 1).padStart(2, '0');
      lines.push(ind3 + '<option value="' + monthVal + '">' + months[i] + '</option>');
    }
    lines.push(ind2 + '</select>');

    // Day select
    lines.push(
      ind2 +
        '<select id="' +
        id +
        '-day" name="' +
        escapeHtml(field.name) +
        '_day"' +
        classAttr(theme.select) +
        required +
        ' style="flex: 1;">',
    );
    lines.push(ind3 + '<option value="">Day</option>');
    for (var d = 1; d <= 31; d++) {
      var dayVal = String(d).padStart(2, '0');
      lines.push(ind3 + '<option value="' + dayVal + '">' + d + '</option>');
    }
    lines.push(ind2 + '</select>');

    lines.push(ind1 + '</div>');
    lines.push(renderFieldError(field, theme, indentLevel + 1));
    lines.push(ind + '</div>');

    return lines
      .filter(function (line) {
        return line !== '';
      })
      .join('\n');
  }

  /**
   * Render honeypot field (hidden from humans, visible to bots)
   */
  function renderHoneypot(field, theme, indentLevel) {
    indentLevel = indentLevel || 0;
    var ind = indent(indentLevel);
    var ind1 = indent(indentLevel + 1);

    var id = generateId(field.name);

    var lines = [];
    lines.push(ind + '<div' + classAttr(theme.honeypot) + ' aria-hidden="true">');
    lines.push(ind1 + '<label for="' + id + '">Leave this field empty</label>');
    lines.push(
      ind1 +
        '<input type="text" id="' +
        id +
        '" name="' +
        escapeHtml(field.name) +
        '" tabindex="-1" autocomplete="off">',
    );
    lines.push(ind + '</div>');

    return lines.join('\n');
  }

  /**
   * Render reCAPTCHA placeholder
   */
  function renderRecaptcha(field, theme, version, indentLevel) {
    indentLevel = indentLevel || 0;
    var ind = indent(indentLevel);
    var ind1 = indent(indentLevel + 1);

    var options = parseJson(field.options, {});
    var siteKey = options.siteKey || options.site_key || '';

    var lines = [];
    lines.push(ind + '<div' + classAttr(theme.formGroup) + '>');

    if (version === 'v2') {
      lines.push(ind1 + '<div class="g-recaptcha" data-sitekey="' + escapeHtml(siteKey) + '"></div>');
      lines.push(ind1 + '<!-- Include reCAPTCHA v2 script: -->');
      lines.push(ind1 + '<!-- <script src="https://www.google.com/recaptcha/api.js" async defer></script> -->');
    } else if (version === 'v3') {
      lines.push(ind1 + '<input type="hidden" name="g-recaptcha-response" id="g-recaptcha-response">');
      lines.push(ind1 + '<!-- Include reCAPTCHA v3 script: -->');
      lines.push(
        ind1 +
          '<!-- <script src="https://www.google.com/recaptcha/api.js?render=' +
          escapeHtml(siteKey) +
          '"></script> -->',
      );
      lines.push(ind1 + '<!-- Execute reCAPTCHA on form submit and set the token to the hidden input -->');
    } else if (version === 'enterprise') {
      lines.push(ind1 + '<input type="hidden" name="g-recaptcha-response" id="g-recaptcha-response">');
      lines.push(ind1 + '<!-- Include reCAPTCHA Enterprise script: -->');
      lines.push(
        ind1 +
          '<!-- <script src="https://www.google.com/recaptcha/enterprise.js?render=' +
          escapeHtml(siteKey) +
          '"></script> -->',
      );
    }

    lines.push(renderFieldError(field, theme, indentLevel + 1));
    lines.push(ind + '</div>');

    return lines
      .filter(function (line) {
        return line !== '';
      })
      .join('\n');
  }

  /**
   * Render color picker
   */
  function renderColorPicker(field, theme, indentLevel) {
    indentLevel = indentLevel || 0;
    var ind = indent(indentLevel);
    var ind1 = indent(indentLevel + 1);

    var id = generateId(field.name);
    var required = field.required ? ' required' : '';
    var defaultValue = field.defaultValue || '#000000';

    var lines = [];
    lines.push(ind + '<div' + classAttr(theme.formGroup) + '>');
    lines.push(renderLabel(field, theme, id, indentLevel + 1));
    lines.push(
      ind1 +
        '<input type="color" id="' +
        id +
        '" name="' +
        escapeHtml(field.name) +
        '"' +
        classAttr(theme.input) +
        ' value="' +
        escapeHtml(defaultValue) +
        '"' +
        required +
        ' style="height: 40px; padding: 2px;">',
    );
    lines.push(renderFieldError(field, theme, indentLevel + 1));
    lines.push(ind + '</div>');

    return lines
      .filter(function (line) {
        return line !== '';
      })
      .join('\n');
  }

  /**
   * Render label for a field
   */
  function renderLabel(field, theme, forId, indentLevel) {
    indentLevel = indentLevel || 0;
    var ind = indent(indentLevel);

    if (field.fieldType === FIELD_TYPES.BOOLEAN) {
      return '';
    }

    var label = field.label || field.name;
    var forAttr = forId ? ' for="' + forId + '"' : '';

    var requiredSpan = field.required ? '<span' + classAttr(theme.required) + '>*</span>' : '';

    return ind + '<label' + forAttr + classAttr(theme.label) + '>' + escapeHtml(label) + requiredSpan + '</label>';
  }

  /**
   * Render field error placeholder
   */
  function renderFieldError(field, theme, indentLevel) {
    indentLevel = indentLevel || 0;
    var ind = indent(indentLevel);
    return ind + '<div' + classAttr(theme.errorText) + ' data-field="' + escapeHtml(field.name) + '"></div>';
  }

  // ============================================================================
  // Main Field Renderer
  // ============================================================================

  /**
   * Render a single field based on its type
   */
  function renderField(field, theme, options, indentLevel) {
    indentLevel = indentLevel || 0;

    switch (field.fieldType) {
      case FIELD_TYPES.SHORT_TEXT:
        return renderTextInput(field, theme, 'text', indentLevel);

      case FIELD_TYPES.LONG_TEXT:
        return renderTextarea(field, theme, indentLevel);

      case FIELD_TYPES.NUMBER:
        return renderNumberInput(field, theme, indentLevel);

      case FIELD_TYPES.DATE:
      case FIELD_TYPES.BIRTHDATE:
        return renderTextInput(field, theme, 'date', indentLevel);

      case FIELD_TYPES.TIME:
        return renderTextInput(field, theme, 'time', indentLevel);

      case FIELD_TYPES.DATETIME:
        return renderTextInput(field, theme, 'datetime-local', indentLevel);

      case FIELD_TYPES.EMAIL:
        return renderTextInput(field, theme, 'email', indentLevel);

      case FIELD_TYPES.PHONE:
        return renderTextInput(field, theme, 'tel', indentLevel);

      case FIELD_TYPES.URL:
        return renderTextInput(field, theme, 'url', indentLevel);

      case FIELD_TYPES.PASSWORD:
        return renderTextInput(field, theme, 'password', indentLevel);

      case FIELD_TYPES.BOOLEAN:
        return renderCheckbox(field, theme, indentLevel);

      case FIELD_TYPES.MULTIPLE_CHOICE:
        if (field.minValue === 1 && field.maxValue === 1) {
          return renderSelect(field, theme, indentLevel);
        }
        return renderMultipleChoice(field, theme, indentLevel);

      case FIELD_TYPES.REGULAR_EXPRESSION:
      case FIELD_TYPES.USERNAME:
      case FIELD_TYPES.SLUG:
      case FIELD_TYPES.UUID:
      case FIELD_TYPES.LOOKUP:
        return renderTextInput(field, theme, 'text', indentLevel);

      case FIELD_TYPES.HEX_COLOR:
        return renderColorPicker(field, theme, indentLevel);

      case FIELD_TYPES.BIRTHDAY:
        return renderBirthday(field, theme, indentLevel);

      case FIELD_TYPES.COORDINATES:
        return renderTextInput(field, theme, 'text', indentLevel);

      case FIELD_TYPES.CREDIT_CARD:
        var html = renderTextInput(field, theme, 'text', indentLevel);
        return html.replace(
          'type="text"',
          'type="text" inputmode="numeric" pattern="[0-9\\s]*" autocomplete="cc-number"',
        );

      case FIELD_TYPES.FILE:
        if (options && options.allowFiles === false) {
          return indent(indentLevel) + '<!-- File upload not enabled for this form -->';
        }
        return renderFileInput(field, theme, indentLevel);

      case FIELD_TYPES.ANTISPAMBOT:
        return renderHoneypot(field, theme, indentLevel);

      case FIELD_TYPES.RECAPTCHA2:
        return renderRecaptcha(field, theme, 'v2', indentLevel);

      case FIELD_TYPES.RECAPTCHA3:
        return renderRecaptcha(field, theme, 'v3', indentLevel);

      case FIELD_TYPES.RECAPTCHA_ENTERPRISE:
        return renderRecaptcha(field, theme, 'enterprise', indentLevel);

      default:
        return renderTextInput(field, theme, 'text', indentLevel);
    }
  }

  // ============================================================================
  // Form Generator
  // ============================================================================

  /**
   * Generate complete form HTML
   */
  function generateFormHtml(formConfig, options) {
    options = options || {};
    var themeName = options.theme || 'default';
    var theme = THEMES[themeName] || THEMES.default;
    var submitLabel = options.submitLabel || 'Submit';
    var apiUrl = options.apiUrl || DEFAULT_API_URL;
    var formAction = apiUrl + '/api/submissions/' + formConfig.path;

    var lines = [];

    // Add default styles if using default theme
    if (themeName === 'default' && options.includeStyles !== false) {
      lines.push('<style>');
      lines.push(DEFAULT_STYLES);
      lines.push('</style>');
      lines.push('');
    }

    // Error summary (hidden by default)
    lines.push('<div' + classAttr(theme.errorSummary + ' error-summary'));
    lines.push(INDENT + '<ul' + classAttr(theme.errorSummaryList) + ' id="errorSummaryList"></ul>');
    lines.push('</div>');
    lines.push('');

    // Success message (hidden by default)
    lines.push('<div' + classAttr(theme.successMessage + ' success-message'));
    lines.push(INDENT + '<span' + classAttr(theme.successMessageText) + ' id="successMessageText"></span>');
    lines.push('</div>');
    lines.push('');

    // Form start
    var formAttrs = ' action="' + escapeHtml(formAction) + '" method="POST"';
    formAttrs += classAttr(theme.form);
    if (formConfig.allowFiles) {
      formAttrs += ' enctype="multipart/form-data"';
    }
    lines.push('<form' + formAttrs + '>');

    // Form description
    if (formConfig.description && options.showDescription !== false) {
      lines.push(INDENT + '<div' + classAttr(theme.description) + ' style="margin-bottom: 1rem;">');
      lines.push(INDENT + INDENT + escapeHtml(formConfig.description));
      lines.push(INDENT + '</div>');
      lines.push('');
    }

    // Render all fields
    var fields = formConfig.fields || [];
    for (var i = 0; i < fields.length; i++) {
      lines.push(renderField(fields[i], theme, { allowFiles: formConfig.allowFiles }, 1));
      lines.push('');
    }

    // Submit button
    lines.push(INDENT + '<div' + classAttr(theme.formGroup) + '>');
    lines.push(INDENT + INDENT + '<button type="submit"' + classAttr(theme.button) + '>');
    lines.push(INDENT + INDENT + INDENT + '<span class="spinner"></span>');
    lines.push(INDENT + INDENT + INDENT + '<span class="button-text">' + escapeHtml(submitLabel) + '</span>');
    lines.push(INDENT + INDENT + '</button>');
    lines.push(INDENT + '</div>');

    lines.push('</form>');

    return lines.join('\n');
  }

  // ============================================================================
  // API Functions
  // ============================================================================

  /**
   * Fetch form configuration from API
   */
  function fetchFormConfig(path, apiUrl) {
    apiUrl = apiUrl || DEFAULT_API_URL;

    var query = {
      query:
        'query PublicFormGet($path: String!) { publicFormGet(path: $path) { code errors { name errors } data { path name description allowFiles fields { name fieldType label required minValue maxValue options orderNo defaultValue } } } }',
      variables: { path: path },
    };

    return fetch(apiUrl + '/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(query),
    })
      .then(function (response) {
        return response.json();
      })
      .then(function (result) {
        var data = result.data && result.data.publicFormGet;

        if (!data || data.code !== 0) {
          var errorMsg = 'Form not found';
          if (data && data.errors && data.errors.length > 0) {
            errorMsg = data.errors[0].errors.join(', ');
          }
          throw new Error(errorMsg);
        }

        return data.data[0];
      });
  }

  // ============================================================================
  // Public API
  // ============================================================================

  var FormSubmitsEmbed = {
    version: VERSION,

    /**
     * Fetch form configuration from API
     * @param {string} path - Form path/ID
     * @param {Object} options - Options (apiUrl)
     * @returns {Promise<Object>} Form configuration
     */
    fetchConfig: function (path, options) {
      options = options || {};
      return fetchFormConfig(path, options.apiUrl);
    },

    /**
     * Generate HTML string for a form
     * @param {string} path - Form path/ID
     * @param {Object} options - Options (theme, apiUrl, submitLabel, includeStyles, showDescription)
     * @returns {Promise<string>} Generated HTML
     */
    generateHtml: function (path, options) {
      options = options || {};
      return fetchFormConfig(path, options.apiUrl).then(function (formConfig) {
        return generateFormHtml(formConfig, options);
      });
    },

    /**
     * Generate HTML from existing config (no API call)
     * @param {Object} formConfig - Form configuration object
     * @param {Object} options - Options (theme, apiUrl, submitLabel, includeStyles, showDescription)
     * @returns {string} Generated HTML
     */
    generateHtmlFromConfig: function (formConfig, options) {
      return generateFormHtml(formConfig, options);
    },

    /**
     * Embed form into a container
     * @param {string} path - Form path/ID
     * @param {string|HTMLElement} container - Container ID or element
     * @param {Object} options - Options (theme, apiUrl, submitLabel, onSuccess, onError)
     * @returns {Promise<void>}
     */
    embed: function (path, container, options) {
      options = options || {};
      var containerEl = typeof container === 'string' ? document.getElementById(container) : container;

      if (!containerEl) {
        return Promise.reject(new Error('Container not found: ' + container));
      }

      return this.generateHtml(path, options)
        .then(function (html) {
          containerEl.innerHTML = html;

          var formEl = containerEl.querySelector('form');

          if (formEl && typeof window.FormSubmissionHandler === 'function') {
            var handler = new window.FormSubmissionHandler(formEl, {
              onSuccess: options.onSuccess,
              onError: options.onError,
              onBeforeSubmit: options.onBeforeSubmit,
              onAfterSubmit: options.onAfterSubmit,
            });

            handler.enableAutoClearErrors();

            formEl.addEventListener('submit', function (e) {
              e.preventDefault();
              var button = formEl.querySelector('button[type="submit"]');
              handler.submitAjax(button);
            });
          }

          return formEl;
        })
        .catch(function (error) {
          containerEl.innerHTML =
            '<div style="color: #dc2626; padding: 1rem; border: 1px solid #fecaca; border-radius: 0.375rem; background: #fef2f2;">' +
            'Failed to load form: ' +
            escapeHtml(error.message) +
            '</div>';
          throw error;
        });
    },

    /**
     * Get available themes
     * @returns {string[]} Theme names
     */
    getThemes: function () {
      return Object.keys(THEMES);
    },

    /**
     * Get field type constants
     * @returns {Object} Field type IDs
     */
    getFieldTypes: function () {
      return Object.assign({}, FIELD_TYPES);
    },
  };

  // ============================================================================
  // Auto-initialization
  // ============================================================================

  function autoInit() {
    var scripts = document.getElementsByTagName('script');
    var currentScript = null;

    for (var i = scripts.length - 1; i >= 0; i--) {
      var script = scripts[i];
      if (script.src && script.src.indexOf('formsubmits-embed') !== -1) {
        currentScript = script;
        break;
      }
    }

    if (!currentScript) {
      return;
    }

    var formPath = currentScript.getAttribute('data-form-path');
    var containerId = currentScript.getAttribute('data-container');
    var theme = currentScript.getAttribute('data-theme') || 'default';
    var apiUrl = currentScript.getAttribute('data-api-url');
    var submitLabel = currentScript.getAttribute('data-submit-label');

    if (formPath && containerId) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
          FormSubmitsEmbed.embed(formPath, containerId, {
            theme: theme,
            apiUrl: apiUrl,
            submitLabel: submitLabel,
          });
        });
      } else {
        FormSubmitsEmbed.embed(formPath, containerId, {
          theme: theme,
          apiUrl: apiUrl,
          submitLabel: submitLabel,
        });
      }
    }
  }

  window.FormSubmitsEmbed = FormSubmitsEmbed;

  autoInit();
})(window);
