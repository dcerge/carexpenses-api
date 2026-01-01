/**
 * FormSubmit.js - Form Submission Handler Library
 * Version: 1.0.0
 *
 * A lightweight library for handling form submissions with validation error display
 * and success message handling for FormSubmits API.
 *
 * Usage:
 *   <script src="https://yourcdn.com/formsubmit.js"></script>
 *   <script>
 *     const handler = new FormSubmissionHandler(document.getElementById('myForm'), {
 *       onSuccess: (response) => console.log('Success!', response),
 *       onError: (response) => console.log('Error!', response)
 *     });
 *   </script>
 *
 * @author FormSubmits
 * @license MIT
 */

(function (window) {
  'use strict';

  /**
   * FormSubmissionHandler - Main class for handling form submissions
   *
   * @class
   * @param {HTMLFormElement} formElement - The form element to handle
   * @param {Object} options - Configuration options
   * @param {string} options.errorSummarySelector - CSS selector for error summary container
   * @param {string} options.errorSummaryListSelector - CSS selector for error list container
   * @param {string} options.fieldErrorSelector - CSS selector for field error elements (should have data-field attribute)
   * @param {string} options.successMessageSelector - CSS selector for success message container
   * @param {string} options.successMessageTextSelector - CSS selector for success message text element
   * @param {Function} options.onSuccess - Callback function called on successful submission
   * @param {Function} options.onError - Callback function called on submission error
   * @param {Function} options.onBeforeSubmit - Callback function called before submission starts
   * @param {Function} options.onAfterSubmit - Callback function called after submission completes
   * @param {boolean} options.autoScroll - Whether to auto-scroll to messages (default: true)
   * @param {boolean} options.resetOnSuccess - Whether to reset form after successful submission (default: true)
   * @param {string} options.invalidClass - CSS class to add to invalid inputs (default: 'is-invalid')
   * @param {string} options.showClass - CSS class to show elements (default: 'show')
   */
  function FormSubmissionHandler(formElement, options) {
    if (!formElement || !(formElement instanceof HTMLFormElement)) {
      throw new Error('FormSubmissionHandler: First argument must be a form element');
    }

    this.form = formElement;
    this.options = Object.assign(
      {
        errorSummarySelector: '.error-summary',
        errorSummaryListSelector: '#errorSummaryList',
        fieldErrorSelector: '[data-field]',
        successMessageSelector: '.success-message',
        successMessageTextSelector: '#successMessageText',
        onSuccess: null,
        onError: null,
        onBeforeSubmit: null,
        onAfterSubmit: null,
        autoScroll: true,
        resetOnSuccess: true,
        invalidClass: 'is-invalid',
        showClass: 'show',
      },
      options || {},
    );

    // Find elements
    this.errorSummary = document.querySelector(this.options.errorSummarySelector);
    this.errorSummaryList = document.querySelector(this.options.errorSummaryListSelector);
    this.successMessage = document.querySelector(this.options.successMessageSelector);
    this.successMessageText = document.querySelector(this.options.successMessageTextSelector);

    // Store loading state
    this.isSubmitting = false;
  }

  /**
   * Clear all error messages from the form
   */
  FormSubmissionHandler.prototype.clearErrors = function () {
    // Clear field errors
    var fieldErrors = this.form.querySelectorAll(this.options.fieldErrorSelector);
    var showClass = this.options.showClass;

    fieldErrors.forEach(function (errorEl) {
      errorEl.classList.remove(showClass);
      errorEl.textContent = '';
    });

    // Remove invalid class from inputs
    var invalidClass = this.options.invalidClass;
    var invalidInputs = this.form.querySelectorAll('.' + invalidClass);

    invalidInputs.forEach(function (input) {
      input.classList.remove(invalidClass);
    });

    // Clear error summary
    if (this.errorSummary) {
      this.errorSummary.classList.remove(showClass);
    }
    if (this.errorSummaryList) {
      this.errorSummaryList.innerHTML = '';
    }

    // Clear success message
    if (this.successMessage) {
      this.successMessage.classList.remove(showClass);
    }
  };

  /**
   * Display errors from the API response
   * @param {Array} errors - Array of error objects from API
   *   Format: [{ name: 'fieldName', errors: ['error1', 'error2'] }]
   */
  FormSubmissionHandler.prototype.displayErrors = function (errors) {
    this.clearErrors();

    if (!errors || !Array.isArray(errors)) {
      return;
    }

    var genericErrors = [];
    var form = this.form;
    var invalidClass = this.options.invalidClass;
    var showClass = this.options.showClass;

    errors.forEach(function (errorObj) {
      var fieldName = errorObj.name;
      var errorMessages = errorObj.errors || [];

      if (!fieldName) {
        // Generic error - add to summary
        genericErrors.push.apply(genericErrors, errorMessages);
      } else {
        // Field-specific error
        var errorText = errorMessages.join('. ');

        // Find the error display element
        var errorEl = form.querySelector('[data-field="' + fieldName + '"]');
        if (errorEl) {
          errorEl.textContent = errorText;
          errorEl.classList.add(showClass);
        }

        // Mark the input as invalid
        var inputEl = form.querySelector('[name="' + fieldName + '"]');
        if (inputEl) {
          inputEl.classList.add(invalidClass);
        }

        // Also add to generic errors for summary
        genericErrors.push(fieldName + ': ' + errorText);
      }
    });

    // Display error summary if there are any errors
    if (genericErrors.length > 0 && this.errorSummary && this.errorSummaryList) {
      this.errorSummaryList.innerHTML = genericErrors
        .map(function (error) {
          return '<li>' + escapeHtml(error) + '</li>';
        })
        .join('');
      this.errorSummary.classList.add(showClass);

      // Scroll to error summary
      if (this.options.autoScroll) {
        this.errorSummary.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  /**
   * Display success message
   * @param {Object} data - Response data from API
   *   Format: [{ submission: { requestId: '...' }, message: '...' }]
   */
  FormSubmissionHandler.prototype.displaySuccess = function (data) {
    this.clearErrors();

    if (this.successMessage && this.successMessageText) {
      var message = 'Your submission has been received successfully!';

      // Try to get custom message from response
      if (data && Array.isArray(data) && data[0]) {
        var firstItem = data[0];
        if (firstItem.message) {
          message = firstItem.message;
        }
        if (firstItem.submission && firstItem.submission.requestId) {
          message += ' Reference ID: ' + firstItem.submission.requestId;
        }
      }

      this.successMessageText.textContent = message;
      this.successMessage.classList.add(this.options.showClass);

      // Scroll to success message
      if (this.options.autoScroll) {
        this.successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  /**
   * Handle API response
   * @param {Object} response - Response from API
   *   Format: { code: 0, data: [...], errors: [...] }
   */
  FormSubmissionHandler.prototype.handleResponse = function (response) {
    if (response.code === 0) {
      // Success
      this.displaySuccess(response.data);

      // Reset form if configured
      if (this.options.resetOnSuccess) {
        this.form.reset();
      }

      // Call success callback if provided
      if (typeof this.options.onSuccess === 'function') {
        this.options.onSuccess(response);
      }
    } else {
      // Error
      this.displayErrors(response.errors);

      // Call error callback if provided
      if (typeof this.options.onError === 'function') {
        this.options.onError(response);
      }
    }
  };

  /**
   * Show loading state on button
   * @param {HTMLButtonElement} button - Button element
   */
  FormSubmissionHandler.prototype.showLoading = function (button) {
    if (!button) return;

    button.disabled = true;
    button.classList.add('loading');

    var spinner = button.querySelector('.spinner-border, .spinner, .loading-spinner');
    var text = button.querySelector('.button-text');

    if (spinner) {
      spinner.style.display = 'inline-block';
      spinner.classList.remove('d-none');
    }
    if (text) {
      button.setAttribute('data-original-text', text.textContent);
      text.textContent = 'Submitting...';
    } else {
      button.setAttribute('data-original-text', button.textContent);
      button.textContent = 'Submitting...';
    }
  };

  /**
   * Hide loading state on button
   * @param {HTMLButtonElement} button - Button element
   */
  FormSubmissionHandler.prototype.hideLoading = function (button) {
    if (!button) return;

    button.disabled = false;
    button.classList.remove('loading');

    var spinner = button.querySelector('.spinner-border, .spinner, .loading-spinner');
    var text = button.querySelector('.button-text');
    var originalText = button.getAttribute('data-original-text');

    if (spinner) {
      spinner.style.display = 'none';
      spinner.classList.add('d-none');
    }
    if (text && originalText) {
      text.textContent = originalText;
    } else if (originalText) {
      button.textContent = originalText;
    }

    button.removeAttribute('data-original-text');
  };

  /**
   * Submit form via AJAX
   * @param {HTMLButtonElement} button - Optional button element that triggered submission
   * @returns {Promise} Promise that resolves with the response
   */
  FormSubmissionHandler.prototype.submitAjax = function (button) {
    var self = this;

    // Prevent multiple simultaneous submissions
    if (self.isSubmitting) {
      return Promise.reject(new Error('Form is already being submitted'));
    }

    self.isSubmitting = true;
    self.clearErrors();

    // Call before submit callback
    if (typeof self.options.onBeforeSubmit === 'function') {
      self.options.onBeforeSubmit();
    }

    // Show loading state
    self.showLoading(button);

    var formData = new FormData(self.form);
    var url = self.form.action;

    // Use fetch or axios depending on what's available
    var submitPromise;

    if (typeof axios !== 'undefined') {
      // Use Axios if available
      submitPromise = axios
        .post(url, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'X-Requested-With': 'XMLHttpRequest',
          },
        })
        .then(function (response) {
          return response.data;
        })
        .catch(function (error) {
          if (error.response && error.response.data) {
            return error.response.data;
          }
          throw error;
        });
    } else if (typeof fetch !== 'undefined') {
      // Use Fetch API as fallback
      submitPromise = fetch(url, {
        method: 'POST',
        body: formData,
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      }).then(function (response) {
        return response.json();
      });
    } else {
      // Neither axios nor fetch available
      self.isSubmitting = false;
      self.hideLoading(button);
      return Promise.reject(
        new Error('No HTTP library available. Please include Axios or use a modern browser with Fetch API.'),
      );
    }

    return submitPromise
      .then(function (data) {
        self.handleResponse(data);
        return data;
      })
      .catch(function (error) {
        console.error('Submission error:', error);
        self.displayErrors([
          {
            name: '',
            errors: ['An unexpected error occurred. Please try again later.'],
          },
        ]);
        throw error;
      })
      .finally(function () {
        self.isSubmitting = false;
        self.hideLoading(button);

        // Call after submit callback
        if (typeof self.options.onAfterSubmit === 'function') {
          self.options.onAfterSubmit();
        }
      });
  };

  /**
   * Enable auto-clearing of errors when user starts typing
   */
  FormSubmissionHandler.prototype.enableAutoClearErrors = function () {
    var self = this;
    var inputs = this.form.querySelectorAll('input, textarea, select');
    var invalidClass = this.options.invalidClass;

    inputs.forEach(function (input) {
      input.addEventListener('input', function () {
        this.classList.remove(invalidClass);
        var fieldError = self.form.querySelector('[data-field="' + this.name + '"]');
        if (fieldError) {
          fieldError.classList.remove(self.options.showClass);
        }
      });
    });
  };

  /**
   * Utility function to escape HTML to prevent XSS
   * @private
   */
  function escapeHtml(text) {
    var map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, function (m) {
      return map[m];
    });
  }

  // Expose to global scope
  window.FormSubmissionHandler = FormSubmissionHandler;

  // jQuery plugin (optional, if jQuery is available)
  if (typeof jQuery !== 'undefined') {
    jQuery.fn.formSubmissionHandler = function (options) {
      return this.each(function () {
        if (!jQuery.data(this, 'formSubmissionHandler')) {
          jQuery.data(this, 'formSubmissionHandler', new FormSubmissionHandler(this, options));
        }
      });
    };
  }
})(window);
