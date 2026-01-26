/**
     * Helper to create HTML file list from array
     * @param {Array} files - Array of filenames/paths
     * @returns {String} - HTML
     */

var recordData = {};
var isFormLocked = false;

// --- Global API Logging ---
$(document).ajaxSend(function (event, jqXHR, settings) {
    let requestData = 'No Body';
    if (settings.data) {
        try {
            requestData = JSON.parse(settings.data);
        } catch (e) {
            requestData = settings.data;
        }
    }
    console.log(`[API Request] ${settings.type} ${settings.url}`, requestData);
});

$(document).ajaxComplete(function (event, jqXHR, settings) {
    console.log(`[API Response] ${settings.type} ${settings.url}`, jqXHR.responseJSON || jqXHR.responseText);
});
// --------------------------

// Extract token from URL
console.log("-----------------------------------------");
console.log("Locker App Script Loaded");
console.log("Current URL:", window.location.href);
const urlParams = new URLSearchParams(window.location.search);
let token = urlParams.get('token');

// Support Path-based Token (e.g., /ab7af1ed)
if (!token) {
    const path = window.location.pathname;
    // Remove leading/trailing slashes and get last segment
    const segments = path.replace(/^\/+|\/+$/g, '').split('/');
    if (segments.length > 0 && segments[0] !== '') {
        token = segments[segments.length - 1];
    }
}

console.log("Extracted Token:", token);
if (!token) {
    console.error("CRITICAL: No token found in URL! The app may not function correctly.");
}
console.log("-----------------------------------------");

/**
 * Play warning sound for validation errors
 * Uses Web Audio API to generate a gentle warning tone
 */
function playWarningSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Warning tone settings - two-tone alert
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(587.33, audioContext.currentTime); // D5 note
        oscillator.frequency.setValueAtTime(466.16, audioContext.currentTime + 0.15); // Bb4 note

        // Volume envelope - gentle fade in and out
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.15);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.2);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.4);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.4);
    } catch (e) {
        // Audio not supported or blocked - fail silently
        console.log('Warning sound could not be played:', e);
    }
}

/**
 * Scroll to question section on mobile devices
 * Ensures the question is visible after navigation
 */
function scrollToQuestion() {
    // Check if on mobile device (screen width < 768px)
    if ($(window).width() <= 768) {
        const questionCard = $('.question-card');
        if (questionCard.length > 0) {
            // Scroll to the question card with smooth animation
            $('html, body').animate({
                scrollTop: questionCard.offset().top - 80 // 80px offset for header
            }, 400, 'swing'); // 400ms smooth animation
        }
    }
}

/**
 * Comprehensive email validation function
 * @param {String} email - Email address to validate
 * @returns {Object} - {isValid: boolean, message: string}
 */
function validateEmail(email) {
    // Remove whitespace
    email = email.trim();

    // Check if email is empty
    if (!email) {
        return { isValid: false, message: 'Email address is required' };
    }

    // Basic format check: must contain @ and domain
    const basicRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!basicRegex.test(email)) {
        return { isValid: false, message: 'Please enter a valid email address (e.g., name@example.com)' };
    }

    // More comprehensive validation
    const comprehensiveRegex = /^[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!comprehensiveRegex.test(email)) {
        return { isValid: false, message: 'Email contains invalid characters' };
    }

    // Check for consecutive dots
    if (email.includes('..')) {
        return { isValid: false, message: 'Email cannot contain consecutive dots' };
    }

    // Check email length (standard max is 254 characters)
    if (email.length > 254) {
        return { isValid: false, message: 'Email address is too long' };
    }

    // Split and validate parts
    const parts = email.split('@');
    const localPart = parts[0];
    const domainPart = parts[1];

    // Local part validation (before @)
    if (localPart.length > 64) {
        return { isValid: false, message: 'Email username is too long' };
    }

    if (localPart.startsWith('.') || localPart.endsWith('.')) {
        return { isValid: false, message: 'Email username cannot start or end with a dot' };
    }

    // Domain validation (after @)
    if (domainPart.length > 253) {
        return { isValid: false, message: 'Email domain is too long' };
    }

    if (domainPart.startsWith('-') || domainPart.endsWith('-')) {
        return { isValid: false, message: 'Email domain cannot start or end with a hyphen' };
    }

    // Check for valid TLD (at least 2 characters)
    const domainParts = domainPart.split('.');
    const tld = domainParts[domainParts.length - 1];
    if (tld.length < 2) {
        return { isValid: false, message: 'Email domain extension is too short' };
    }

    // All validations passed
    return { isValid: true, message: '' };
}

/**
 * Add email validation to an input field
 * @param {jQuery} emailInput - The email input field
 */
function addEmailValidation(emailInput) {
    // Remove existing error message if any
    emailInput.siblings('.email-error-message').remove();

    // Add error message element
    emailInput.after('<span class="email-error-message"></span>');
    const errorMsg = emailInput.next('.email-error-message');

    // Validation on blur (when user leaves the field)
    emailInput.on('blur', function () {
        const email = $(this).val().trim();
        if (email) {
            const validation = validateEmail(email);
            if (!validation.isValid) {
                $(this).addClass('invalid-email');
                errorMsg.text(validation.message).addClass('show');
            } else {
                $(this).removeClass('invalid-email');
                errorMsg.removeClass('show');
            }
        } else {
            $(this).removeClass('invalid-email');
            errorMsg.removeClass('show');
        }
    });

    // Remove error styling on focus
    emailInput.on('focus', function () {
        $(this).removeClass('invalid-email');
        errorMsg.removeClass('show');
    });
}

function createFileListHTML(files) { // FIX 1: Renamed from createFileListtHTML
    if (!files || files.length === 0) {
        return '<p style="color: #999; font-style: italic;">No files uploaded</p>';
    }

    let html = '<div class="uploaded-files-list">';
    files.forEach((file, index) => {
        const fileName = typeof file === 'string' ? file : (file.name || file);
        const fileExtension = fileName.split('.').pop().toLowerCase();
        const fileIcon = fileExtension === 'pdf' ? '📄' : fileExtension.match(/jpg|jpeg|png|gif|JPG|JPEG|PNG|GIF/) ? '🖼️' : '📎';

        html += `
                <div class="file-item" style="display: flex; align-items: center; padding: 8px; background: #f5f5f5; border-radius: 4px; margin: 5px 0; border-left: 3px solid #4CAF50;">
                    <span style="margin-right: 10px; font-size: 18px;">${fileIcon}</span>
                    <span style="flex: 1; word-break: break-all;">${fileName}</span>
                </div>
            `;
    });
    html += '</div>';
    return html;
}

/**
 * Get uploaded files for a specific field from recordData
 * @param {String} fieldName - Database field name
 * @returns {Array} - Array of file names
 */
function getUploadedFiles(fieldName) {
    // First, look in recordData directly
    let files = recordData[fieldName];

    // Also check in recordData.questions if it's a question field
    if (!files && recordData.questions && recordData.questions[fieldName]) {
        files = recordData.questions[fieldName];
    }

    if (!files) {
        return [];
    }

    // Handle different data formats
    if (typeof files === 'string') {
        // If it's a JSON array string
        if (files.trim().startsWith('[')) {
            try {
                files = JSON.parse(files);
            } catch (e) {
                // Not valid JSON, try comma split
                if (files.includes(',')) {
                    files = files.split(',').map(f => f.trim()).filter(f => f);
                } else {
                    files = files ? [files] : [];
                }
            }
        } else if (files.includes(',')) {
            // Comma-separated string
            files = files.split(',').map(f => f.trim()).filter(f => f);
        } else if (files) {
            // Single file
            files = [files];
        }
    }

    // Ensure it's an array
    if (!Array.isArray(files)) {
        files = files ? [files] : [];
    }

    // Filter out empty/invalid entries
    return files.filter(f => {
        if (!f) return false;
        if (typeof f !== 'string') f = String(f);
        return f && f !== 'undefined' && f !== 'null' && f.trim() !== '';
    });
}

/**
 * Display uploaded files in the summary
 * @param {String} fieldName - Database field name
 * @param {String} displayLabel - Label to show
 * @returns {String} - HTML
 */
function displayUploadedFilesInSummary(fieldName, displayLabel) {
    const files = getUploadedFiles(fieldName);

    let html = `<div style="margin-bottom: 15px;">`;
    html += `<strong>${displayLabel}:</strong><br/>`;

    if (files.length > 0) {
        html += createFileListHTML(files);
    } else {
        html += '<p style="color: #999; font-style: italic;">No files uploaded</p>';
    }

    html += `</div>`;
    return html;
}

/**
 * Helper to create HTML file list from array (for internal use/list items)
 * @param {Array} files - Array of filenames/paths
 * @param {String} dbfield - Database field name (for delete actions)
 * @returns {String} - HTML <li> list items for attached files
 */
/**
 * Smart File URL Resolver
 * Handles legacy filenames, new relative paths, and full URLs
 */
function getFileUrl(file) {
    if (!file) return '#';

    // Case 1: Already a full URL
    if (file.startsWith('http://') || file.startsWith('https://')) {
        return file;
    }

    // New Endpoint: Securely stream file via API
    // Format: api/download_file?token={TOKEN}&file={PATH}
    // We use the global 'token' variable extracted from URL params
    return `api/download_file?token=${token}&file=${file}`;
}

/**
 * Helper to create HTML file list from array (for internal use/list items)
 * @param {Array} files - Array of filenames/paths
 * @param {String} dbfield - Database field name (for delete actions)
 * @returns {String} - HTML <li> list items for attached files
 */
function createFileList(files, dbfield) {
    if (!Array.isArray(files) || files.length === 0) {
        return '';
    }

    var listHtml = '';
    files.forEach(function (file) {
        var deleteAttrs = typeof isFormLocked !== 'undefined' && isFormLocked
            ? 'disabled style="opacity:0.5;cursor:not-allowed;background:transparent;color:#94a3b8;"'
            : '';

        var deleteContent = '❌';

        // Use the smart resolver
        const fileLink = getFileUrl(file);

        listHtml += `
            <li>
                <a href="${fileLink}" target="_blank" title="Click to view file">${file}</a> 
                <button class="btn-delete-file" data-filename="${file}" data-field="${dbfield}" ${deleteAttrs}>
                    ${deleteContent} 
                </button>
            </li>
        `;
    });
    return listHtml;
}


$(document).ready(function () { // FIX 4: Added $

    // Co-travelers data - will be loaded from API
    let coTravelersData = [];

    // --- Configuration ---
    const editablePersonalFields = ['contact_number', 'email', 'address_line_1', 'address_line_2', 'city', 'state_province', 'zip_code'];
    const mandatoryPersonalFields = ['contact_number', 'email', 'address_line_1', 'city', 'state_province', 'zip_code'];
    const countries = ["Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo, Democratic Republic of the", "Congo, Republic of the", "Costa Rica", "Cote d'Ivoire", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kosovo", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar (Burma)", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"];
    const destinations = [{ country: '🇦🇹 Austria', cities: ['Vienna', 'Salzburg', 'Graz', 'Linz', 'Innsbruck'] }, { country: '🇧🇪 Belgium', cities: ['Brussels', 'Antwerp', 'Ghent', 'Bruges', 'Liège'] }, { country: '🇧🇬 Bulgaria', cities: ['Sofia', 'Plovdiv', 'Varna', 'Burgas', 'Ruse'] }, { country: '🇭🇷 Croatia', cities: ['Zagreb', 'Split', 'Dubrovnik', 'Rijeka', 'Osijek'] }, { country: '🇨🇿 Czech Republic', cities: ['Prague', 'Brno', 'Ostrava', 'Plzeň', 'Liberec'] }, { country: '🇩🇰 Denmark', cities: ['Copenhagen', 'Aarhus', 'Odense', 'Aalborg', 'Esbjerg'] }, { country: '🇪🇪 Estonia', cities: ['Tallinn', 'Tartu', 'Narva', 'Pärnu', 'Kohtla-Järve'] }, { country: '🇫🇮 Finland', cities: ['Helsinki', 'Espoo', 'Tampere', 'Vantaa', 'Oulu'] }, { country: '🇫🇷 France', cities: ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice'] }, { country: '🇩🇪 Germany', cities: ['Berlin', 'Munich', 'Hamburg', 'Cologne', 'Frankfurt'] }, { country: '🇬🇷 Greece', cities: ['Athens', 'Thessaloniki', 'Patras', 'Heraklion', 'Larissa'] }, { country: '🇭🇺 Hungary', cities: ['Budapest', 'Debrecen', 'Szeged', 'Miskolc', 'Pécs'] }, { country: '🇮🇸 Iceland', cities: ['Reykjavík', 'Akureyri', 'Reykjanesbær', 'Kopavogur', 'Hafnarfjordur'] }, { country: '🇮🇹 Italy', cities: ['Rome', 'Milan', 'Naples', 'Turin', 'Florence'] }, { country: '🇱🇻 Latvia', cities: ['Riga', 'Jurmala', 'Liepaja', 'Jelgava'] }, { country: '🇱🇮 Liechtenstein', cities: ['Vaduz', 'Balzers', 'Eschen', 'Schaan'] }, { country: '🇱🇹 Lithuania', cities: ['Vilnius', 'Kaunas', 'Klaipeda', 'Šiauliai', 'Panevėžys'] }, { country: '🇱🇺 Luxembourg', cities: ['Luxembourg City', 'Ettelbruck', 'Differdange', 'Dudelange'] }, { country: '🇲🇹 Malta', cities: ['Valletta', 'Mosta', 'Mellieħa', 'Sliema', 'Birkirkara'] }, { country: '🇳🇱 Netherlands', cities: ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven'] }, { country: '🇳🇴 Norway', cities: ['Oslo', 'Bergen', 'Stavanger', 'Trondheim', 'Drammen'] }, { country: '🇵🇱 Poland', cities: ['Warsaw', 'Kraków', 'Gdańsk', 'Wrocław', 'Poznań'] }, { country: '🇵🇹 Portugal', cities: ['Lisbon', 'Porto', 'Braga', 'Coimbra', 'Aveiro'] }, { country: '🇷🇴 Romania', cities: ['Bucharest', 'Cluj-Napoca', 'Timișoara', 'Iași', 'Constanța'] }, { country: '🇸🇰 Slovakia', cities: ['Bratislava', 'Košice', 'Prešov', 'Nitra', 'Žilina'] }, { country: '🇸🇮 Slovenia', cities: ['Ljubljana', 'Maribor', 'Celje', 'Kranj', 'Koper'] }, { country: '🇪🇸 Spain', cities: ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Bilbao'] }, { country: '🇸🇪 Sweden', cities: ['Stockholm', 'Gothenburg', 'Malmö', 'Uppsala', 'Västerås'] }, { country: '🇨🇭 Switzerland', cities: ['Zurich', 'Geneva', 'Basel', 'Bern', 'Lausanne'] }];

    let currentView = '#login-view';
    let currentQuestionIndex = 0;


    const buildStructuredAddressFields = (prefix, isGermany = false) => {
        if (isGermany) {
            return [
                { id: `${prefix}_address_1`, label: 'House Number *', placeholder: 'e.g., 42', type: 'text', isMandatory: true },
                { id: `${prefix}_address_2`, label: 'Street *', placeholder: 'e.g., Hauptstraße', type: 'text', isMandatory: true },
                { id: `${prefix}_city`, label: 'City *', placeholder: 'City name', type: 'text', isMandatory: true },
                { id: `${prefix}_state`, label: 'State/Province *', placeholder: 'State or province', type: 'text', isMandatory: true },
                { id: `${prefix}_zip`, label: 'Postal Code *', placeholder: 'ZIP or postal code', type: 'text', isMandatory: true },
            ];
        } else {
            return [
                { id: `${prefix}_address_1`, label: 'Address Line 1 *', placeholder: 'Street address', type: 'text', isMandatory: true },
                { id: `${prefix}_address_2`, label: 'Address Line 2', placeholder: 'Apartment, suite, etc. (optional)', type: 'text' },
                { id: `${prefix}_city`, label: 'City *', placeholder: 'City name', type: 'text', isMandatory: true },
                { id: `${prefix}_state`, label: 'State/Province *', placeholder: 'State or province', type: 'text', isMandatory: true },
                { id: `${prefix}_zip`, label: 'Postal Code *', placeholder: 'ZIP or postal code', type: 'text', isMandatory: true },
            ];
        }
    };


    const getQuestionsWithDynamicAddressFields = () => {
        const travelCountry = recordData.personal?.travel_country || '';
        const isGermany = travelCountry.toLowerCase() === 'germany';

        return [
            { id: 'marital_status', text: "What is the marital status?", type: 'radio', field: 'marital_status', options: ['Single', 'Married', 'Divorced', 'Widowed'], isMandatory: true, category: 'Personal Profile', note: 'This information helps complete the profile for the application.' },
            { id: 'birth_place', text: "What is the place and country of birth?", type: 'group', isMandatory: true, fields: [{ id: 'place_of_birth', label: 'Place of Birth *', placeholder: 'e.g., Kottayam Kerala', type: 'text', isMandatory: true, validate: 'place_name' }, { id: 'country_of_birth', label: 'Country of Birth *', placeholder: 'Select country', type: 'select', options: countries, isMandatory: true }], category: 'Personal Profile', note: '<strong class="highlight-note">⚠️ This must match passport details exactly.</strong>' },
            { id: 'travel_sponsor', text: "Who will cover the costs of the trip?", type: 'sponsor-details', field: 'travel_covered_by', isMandatory: true, category: 'Financial & Sponsorship', note: 'Please select the primary source of funding for the trip.' },
            { id: 'occupation_status', text: "What is the current occupation?", type: 'radio', field: 'occupation_status', options: ['Employee', 'Self-Employed / Freelancer', 'Student', 'Retired', 'Unemployed / Homemaker / Volunteer / Intern'], isMandatory: true, category: 'Employment / Occupation', note: 'This helps us understand ties to home country.' },
            { id: 'employee_details', text: "Please provide employment details.", type: 'group', isMandatory: true, condition: (data) => data.occupation_status === 'Employee', fields: [{ id: 'occupation_title', label: 'Job Title *', placeholder: 'e.g., Software Engineer', type: 'text', isMandatory: true }, { id: 'company_name', label: 'Company Name *', placeholder: 'e.g., ABC Corporation', type: 'text', isMandatory: true }, ...buildStructuredAddressFields('company', isGermany), { id: 'company_phone', label: 'Company Phone *', placeholder: 'e.g., +44 20 1234 5678', type: 'tel', isMandatory: true }, { id: 'company_email', label: 'Company Email *', placeholder: 'e.g., contact@company.com', type: 'email', isMandatory: true }], category: 'Employment / Occupation', note: 'This information is used to verify employment status.' },
            { id: 'self_employed_details', text: "Please provide your business details.", type: 'group', isMandatory: true, condition: (data) => data.occupation_status === 'Self-Employed / Freelancer', fields: [{ id: 'company_name', label: 'Business Name *', placeholder: 'e.g., ABC Consulting', type: 'text', isMandatory: true }, ...buildStructuredAddressFields('company', isGermany), { id: 'company_phone', label: 'Business Phone / Email', placeholder: 'Contact information', type: 'text' }], category: 'Employment / Occupation', note: 'Details about your business help establish your financial ties.' },
            { id: 'student_details', text: "Please provide your school/university details.", type: 'group', isMandatory: true, condition: (data) => data.occupation_status === 'Student', fields: [{ id: 'company_name', label: 'School / University Name *', placeholder: 'e.g., University of Oxford', type: 'text', isMandatory: true }, ...buildStructuredAddressFields('company', isGermany), { id: 'company_phone', label: 'School Contact Information', placeholder: 'Phone or email', type: 'text' }], category: 'Employment / Occupation', note: 'This helps confirm your status as a student.' },
            { id: 'retired_details', text: "Please confirm your retired status.", type: 'text', field: 'occupation_title', condition: (data) => data.occupation_status === 'Retired', placeholder: "e.g., Retired *", isMandatory: true, category: 'Employment / Occupation', note: "Confirming your status helps in understanding your financial support." },
            { id: 'unemployed_details', text: "Please confirm your current status.", type: 'text', field: 'occupation_title', condition: (data) => data.occupation_status === 'Unemployed / Homemaker / Volunteer / Intern', placeholder: "e.g., Homemaker *", isMandatory: true, category: 'Employment / Occupation', note: 'Please specify your current primary role.' },
            { id: 'credit_card', text: "Do you have a credit card?", type: 'radio', options: ['Yes', 'No'], field: 'has_credit_card', isMandatory: true, category: 'Financial & Sponsorship', note: 'You don’t need a credit card to get a Schengen visa. If you don’t have one, you can show bank statements, a sponsorship letter, or proof of prepaid travel and accommodation instead.' },
            { id: 'fingerprints', text: "Have fingerprints been collected for a previous Schengen visa?", type: 'radio-with-upload', options: ['Yes', 'No'], field: 'fingerprints_taken', isMandatory: true, category: 'Travel History', note: 'If yes, VIS data may be reused, simplifying the process.', uploadField: 'schengen_visa_image', uploadInputName: 'visa_image[]', uploadLabel: 'Please upload a clear picture of that visa.', uploadNote: 'Upload one or more files (PNG, JPG, PDF).' },
            { id: 'travel_dates', text: "What are the planned travel dates?", type: 'group', isMandatory: true, fields: [{ id: 'travel_date_from', label: 'Planned Departure: *', type: 'date', isMandatory: true }, { id: 'travel_date_to', label: 'Planned Return: *', type: 'date', isMandatory: true }], category: 'Travel Plans', note: 'Tip: A travel date at least 30 days after the appointment and a short trip of 2-3 days can improve approval chances.' },
            { id: 'travel_dates_confirm', text: "Please confirm your travel dates.", type: 'confirm-dates', isMandatory: true, category: 'Travel Plans', note: 'Please double-check the dates you have entered.' },
            { id: 'destination', text: "What will be the primary destination city?", type: 'grouped-select', field: 'primary_destination', data: destinations, isMandatory: true, category: 'Travel Plans', note: 'Select the main city where the most time will be spent.' },
            { id: 'has_stay_booking', text: "Have you booked any hotels for this trip?", type: 'radio', field: 'has_stay_booking', options: ['Yes', 'No'], isMandatory: true, category: 'Accommodation', note: 'This applies if traveling as a tourist.', condition: (qData, pData) => (pData.visa_type || '').toLowerCase().includes('tourist') },
            { id: 'accommodation_details', text: "Where will the stay be based on the purpose of visit?", type: 'accommodation', isMandatory: true, category: 'Accommodation', note: 'Provide the full details of the stay.', condition: (qData, pData) => { const visaType = (pData.visa_type || '').toLowerCase(); if (visaType.includes('tourist')) { return qData.has_stay_booking === 'Yes'; } return true; } },
            {
                id: 'evisa_details',
                text: 'eVisa Information',
                type: 'evisa-details',
                isMandatory: true, // Now mandatory
                category: 'Immigration Status',
                note: 'Please provide your eVisa details and upload documentation.',
                fields: [
                    { id: 'evisa_issue_date', label: 'eVisa Issue Date', type: 'date' },
                    { id: 'evisa_expiry_date', label: 'eVisa Expiry Date', type: 'date' },
                    { id: 'evisa_no_date_settled', label: 'No date found - This is showing settled status', type: 'checkbox-text' }, // Will store 'Yes' or 'No'
                    { id: 'evisa_document_path', label: 'Upload eVisa (Screenshot or PDF) *', type: 'file', inputName: 'evisa_document[]', isMandatory: true } // Now mandatory
                ]
            },
            {
                id: 'share_code_details',
                text: 'Most Recent Share Code (Immigration Status)',
                type: 'share-code-details',
                isMandatory: true, // Now mandatory
                category: 'Immigration Status',
                note: 'Share code must be valid for at least 30 days from the appointment date.',
                fields: [
                    { id: 'share_code', label: 'Enter Share Code', type: 'text', isMandatory: false },
                    { id: 'share_code_expiry_date', label: 'Share Code Expiry Date', type: 'date', isMandatory: false },
                    { id: 'share_code_document_path', label: 'Upload Share Code Document (PDF format) *', type: 'file', inputName: 'share_code_document[]', isMandatory: true, accept: 'application/pdf' } // Now mandatory
                ]
            },
            { id: 'bookings', text: "Have any of the following been booked? (Flight, Train, travel ticket)", type: 'radio-with-upload', field: 'has_bookings', options: ['Yes', 'No'], isMandatory: true, category: 'Bookings', note: 'This includes flights, trains, cruises, or any.', uploadField: 'booking_documents_path', uploadInputName: 'booking_document[]', uploadLabel: 'Please upload Flight/Travel ticket document(s).', uploadNote: 'Upload one or more files (PNG, JPG, PDF).' }
        ];
    };

    // Get initial questions (will be refreshed when needed)
    let questions = getQuestionsWithDynamicAddressFields();

    // --- Core Application Logic ---

    function navigateTo(viewId) {
        $('.view.active').removeClass('active').fadeOut(150, () => {
            $(viewId).addClass('active').fadeIn(150);
            currentView = viewId;
            window.scrollTo(0, 0); // Scroll to top on view change
        });
    }

    function updateHeader() {
        $('#header-title').text('LOCKER');
        const p = recordData.personal || {};
        const firstName = p.first_name || '';
        const lastName = p.last_name || '';
        const fullName = firstName && lastName ? `${firstName} ${lastName}` : (firstName || 'Valued Traveler');
        const country = p.travel_country || 'your destination';
        const visaType = p.visa_type || 'visa';
        const center = p.visa_center || 'the visa center';

        // Create personalized visa info subtitle
        let visaInfo = '';
        if (firstName) {
            // Format: "Full Name – Applied for a Country VisaType. Appointment scheduled in Center."
            const article = ['A', 'E', 'I', 'O', 'U'].includes(country.charAt(0).toUpperCase()) ? 'an' : 'a';
            visaInfo = `${fullName} – Applied for ${article} ${country} ${visaType.toLowerCase()}. Appointment scheduled in ${center}.`;
        } else {
            visaInfo = 'VISA INFO';
        }

        $('#header-subtitle').html(visaInfo);

        // TASK 1 FIX: Update the header user name with first name
        $('#header-user-name').text(firstName || 'Valued Traveler');

        // Show appointment date if available (using doc_date field)
        if (p.doc_date && p.doc_date !== '0000-00-00' && p.doc_date !== '') {
            displayAppointmentDate(p.doc_date);
        }

        // Show co-travelers if they exist
        if (coTravelersData && coTravelersData.length > 0) {
            displayCoTravelers();
        }
    }

    // Function to personalize text by replacing you/your with applicant's name
    function personalizeText(text, firstName) {
        if (!firstName) return text;

        const name = firstName;

        // Don't over-personalize - keep some "you/your" for natural flow
        // Only replace in question text, not in conversational header

        // Handle "your" → "name's" (possessive)
        text = text.replace(/\byour\b/gi, function (match) {
            return match === 'your' ? `${name}'s` : `${name}'s`;
        });

        // Handle "you" → name, but avoid repetition
        // Don't replace if name already appears nearby
        if (!text.toLowerCase().includes(name.toLowerCase())) {
            text = text.replace(/\bYou\b/g, name);
            text = text.replace(/\byou\b/g, name);
        }

        return text;
    }

    // NEW: Function to display appointment date
    function displayAppointmentDate(dateString) {
        try {
            // Parse the date (expecting format: YYYY-MM-DD, DD/MM/YYYY, or YYYY-MM-DD HH:MM:SS)
            let dateObj;
            let hasTime = false;

            if (dateString.includes(' ')) {
                // Format: YYYY-MM-DD HH:MM:SS or DD/MM/YYYY HH:MM:SS
                hasTime = true;
                if (dateString.includes('/')) {
                    // DD/MM/YYYY HH:MM:SS
                    const [datePart, timePart] = dateString.split(' ');
                    const [day, month, year] = datePart.split('/');
                    dateObj = new Date(`${year}-${month}-${day}T${timePart}`);
                } else {
                    // YYYY-MM-DD HH:MM:SS
                    dateObj = new Date(dateString.replace(' ', 'T'));
                }
            } else if (dateString.includes('/')) {
                // Format: DD/MM/YYYY
                const parts = dateString.split('/');
                dateObj = new Date(parts[2], parts[1] - 1, parts[0]);
            } else if (dateString.includes('-')) {
                // Format: YYYY-MM-DD
                dateObj = new Date(dateString);
            } else {
                return; // Invalid format
            }

            // Format the date nicely
            const dateOptions = {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            };
            let formattedDate = dateObj.toLocaleDateString('en-GB', dateOptions);

            // Add time if available
            if (hasTime) {
                const timeOptions = {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                };
                const formattedTime = dateObj.toLocaleTimeString('en-GB', timeOptions);
                formattedDate += ` at ${formattedTime}`;
            }

            $('#appointment-date-text').text(formattedDate);
            $('#appointment-date-container').fadeIn(300);
        } catch (error) {
            console.error('Error formatting appointment date:', error);
        }
    }

    // NEW: Function to display co-travelers
    function displayCoTravelers() {
        if (!coTravelersData || coTravelersData.length === 0) {
            return;
        }

        const container = $('#co-travelers-list');
        container.empty();

        // Collect first names for header
        const firstNames = coTravelersData.map(t => t.first_name).join(', ');
        $('#co-travelers-names').text(`(${firstNames})`);

        coTravelersData.forEach((traveler, index) => {
            const travelerCard = `
                <div class="co-traveler-card">
                    <div class="co-traveler-name">
                        <i class="fas fa-user"></i>
                        <span>${traveler.first_name} ${traveler.last_name}</span>
                    </div>
                    <div class="co-traveler-field">
                        <span class="co-traveler-label">Gender</span>
                        <span class="co-traveler-value">${traveler.gender || 'N/A'}</span>
                    </div>
                    <div class="co-traveler-field">
                        <span class="co-traveler-label">Date of Birth</span>
                        <span class="co-traveler-value">${traveler.dob || 'N/A'}</span>
                    </div>
                    <div class="co-traveler-field">
                        <span class="co-traveler-label">Nationality</span>
                        <span class="co-traveler-value">${traveler.nationality || 'N/A'}</span>
                    </div>
                    <div class="co-traveler-field">
                        <span class="co-traveler-label">Passport No.</span>
                        <span class="co-traveler-value">${traveler.passport_no || 'N/A'}</span>
                    </div>
                    <div class="co-traveler-field">
                        <span class="co-traveler-label">Contact</span>
                        <span class="co-traveler-value">${traveler.contact_number || 'N/A'}</span>
                    </div>
                    <div class="co-traveler-access">
                        <button class="access-locker-btn" onclick="grantLockerAccess('${traveler.first_name}', '${traveler.last_name}', ${traveler.id}, '${traveler.dob_raw || ''}')">
                            <i class="fas fa-lock-open"></i>
                            <span>Get Access to Locker</span>
                        </button>
                    </div>
                </div>
            `;

            container.append(travelerCard);
        });

        $('#co-travelers-container').fadeIn(300);

        // Add toggle functionality
        $('#co-travelers-toggle').off('click').on('click', function () {
            const header = $(this);
            const list = $('#co-travelers-list');

            header.toggleClass('collapsed');
            list.toggleClass('collapsed');
        });
    }

    // Function to grant locker access to co-traveller
    window.grantLockerAccess = function (firstName, lastName, dependentId, dobRaw) {
        // Validate dependent ID
        if (!dependentId || dependentId === 'undefined') {
            alert(`❌ Error: Invalid dependent ID for ${firstName}.\n\nPlease contact support.`);
            return;
        }

        // --- FIX: OPEN THE NEW TAB IMMEDIATELY ---
        // Open a blank tab *before* the async call. This bypasses pop-up blockers.
        const newTab = window.open('', '_blank');
        if (newTab) {
            newTab.document.write('Please wait, locating the locker...');
        } else {
            alert('Pop-up blocked! Please allow pop-ups for this site to open the locker.');
            return;
        }
        // --- END FIX ---

        // Show loader
        if (typeof showLoader === 'function') {
            showLoader();
        }

        // Fetch token from database
        // SPRING BOOT MIGRATION: Changed from api/public_api.php
        $.ajax({
            url: 'api/get_dependent_token',
            method: 'POST',
            contentType: 'application/json',
            dataType: 'json',
            data: JSON.stringify({
                dependent_id: dependentId
            }), // Removed action: 'get_dependent_token' as it's now implied by endpoint
            success: function (response) {
                // Hide loader
                if (typeof hideLoader === 'function') {
                    hideLoader();
                }

                // --- THIS IS THE FIX ---
                // We check for `response.status === 'success'` instead of `response.success`
                if (response.status === 'success' && response.data && response.data.public_url_token) {
                    // --- END OF FIX ---

                    const token = response.data.public_url_token;

                    // Generate access URL with f.html
                    const accessUrl = `https://l.visad.co.uk/f.html?token=${token}`;

                    // Generate password from DOB (ddmmyyyy format)
                    let password = 'N/A';
                    if (dobRaw && dobRaw !== 'undefined' && dobRaw !== '' && dobRaw !== '0000-00-00') {
                        try {
                            const date = new Date(dobRaw);
                            const day = String(date.getDate()).padStart(2, '0');
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const year = date.getFullYear();
                            password = `${day}${month}${year}`;
                        } catch (e) {
                            console.error('Error generating password:', e);
                        }
                    }

                    // --- NEW BEHAVIOR: Open in new tab and show password ---

                    // 1. Set the URL of the tab we already opened
                    if (newTab) {
                        newTab.location.href = accessUrl;
                    }
                    // --- END OF NEW BEHAVIOR ---

                    // 2. Alert the user with the password for the new tab
                    /*
                    const message = `🔓 Opening Locker for ${firstName} ${lastName}\n\n` +
                                   `A new tab has been opened. Please use the following password to log in:\n\n` +
                                   `🔑 Password: ${password}\n\n` +
                                   `(This password is their date of birth in ddmmyyyy format)`;
                    
                    alert(message); 
                    */
                    // --- END OF NEW BEHAVIOR ---

                } else {
                    // Close the blank tab if it failed
                    if (newTab) {
                        newTab.close();
                    }
                    alert(`❌ Error: No access token found for ${firstName}.\n\n${response.message || 'Please contact support.'}`);
                }
            },
            error: function (xhr, status, error) {
                // Hide loader
                if (typeof hideLoader === 'function') {
                    hideLoader();
                }
                // Close the blank tab if it failed
                if (newTab) {
                    newTab.close();
                }
                console.error('AJAX Error:', error);
                alert(`❌ Error: Could not retrieve access token.\n\nPlease contact support.`);
            }
        });
    };

    $('#password-form').on('submit', function (e) {
        e.preventDefault();
        const btn = $(this).find('button[type="submit"]');
        btn.prop('disabled', true).html('Verifying... <i class="fas fa-spinner fa-spin"></i>');

        const verifyData = { token, password: $('#password').val() };
        console.log("Verify Request Data:", verifyData);

        // SPRING BOOT MIGRATION: Changed from api/public_api.php?action=verify
        $.ajax({
            url: 'api/verify',
            type: 'POST',
            contentType: 'application/json',
            dataType: 'json',
            data: JSON.stringify(verifyData),
            success: (res) => {
                if (res.status === 'success') {
                    console.log("Logged In User Details:", res.data);
                    // Add logged-in class to show header user info and footer help
                    $('body').addClass('logged-in');

                    recordData = res.data;

                    // NEW: Load co-travelers data from API response
                    coTravelersData = res.data.co_travelers || [];

                    // FIX: Read form_complete status from database via API
                    isFormLocked = recordData.questions && (recordData.questions.form_complete === '1' || recordData.questions.form_complete === 1 || recordData.questions.form_complete === true);

                    $('#progress-bar-container').fadeIn();
                    updateHeader();
                    updateGlobalProgressBar(); // Calculate initial progress

                    if (isFormLocked) {
                        // 1. If form is locked, show summary
                        renderSummaryView();
                        navigateTo('#summary-view');
                    } else {
                        // 2. Check for last question index
                        let lastIndex = parseInt(recordData.questions.last_question_index || 0);
                        currentQuestionIndex = (lastIndex > 0 && lastIndex < questions.length) ? lastIndex : 0;

                        // 3. If new user (index 0), start with personal info.
                        if (currentQuestionIndex === 0) {
                            renderPersonalInfo();
                            checkPersonalInfoCompletion();
                            navigateTo('#personal-info-view');
                        } else {
                            // 4. If returning user, jump straight to their last question
                            navigateTo('#question-flow-view');
                            renderQuestion();
                        }
                    }
                } else {
                    $('#login-error').text(res.message || 'Verification failed.').show();
                    btn.prop('disabled', false).html('Verify & Proceed <i class="fas fa-arrow-right"></i>');
                }
            }, error: () => {
                $('#login-error').text('An unknown error occurred.').show();
                btn.prop('disabled', false).html('Verify & Proceed <i class="fas fa-arrow-right"></i>');
            }
        });
    });

    function renderPersonalInfo() {
        const reviewGrid = $('#personal-info-review-grid');
        const editGrid = $('#personal-info-edit-grid');
        reviewGrid.empty(); editGrid.empty();

        const staticFields = [{ id: 'first_name', label: 'First Name' }, { id: 'last_name', label: 'Last Name' }, { id: 'dob', label: 'Date of Birth' }, { id: 'nationality', label: 'Nationality' }, { id: 'passport_no', label: 'Passport No.' }, { id: 'passport_issue', label: 'Passport Issue' }, { id: 'passport_expire', label: 'Passport Expire' }];

        staticFields.forEach(field => {
            reviewGrid.append(createSummaryInfoItem(field.id, field.label, recordData.personal[field.id], {}, {}, true));
        });

        editablePersonalFields.forEach(id => {
            let label = id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            if (id === 'zip_code') label = 'Postal Code';
            const isMandatory = mandatoryPersonalFields.includes(id);
            const value = recordData.personal[id] || '';

            // Determine input type
            const inputType = id === 'email' ? 'email' : id === 'contact_number' ? 'tel' : 'text';

            // Create the item using the summary builder for consistency, but add old edit controls
            const $item = $(createSummaryInfoItem(id, label, value, {}, {}, false, isMandatory));
            $item.find('.display-value').after(
                `<div class="edit-input" style="display:none;">
                    <input type="${inputType}" value="${value}">
                    <button class="save-btn"><i class="fas fa-check"></i></button>
                    <button class="cancel-btn"><i class="fas fa-times"></i></button>
                </div>`
            );
            editGrid.append($item);

            // Add email validation if this is an email field
            if (id === 'email') {
                const emailInput = $item.find('input[type="email"]');
                addEmailValidation(emailInput);
            }
        });
    }

    function checkPersonalInfoCompletion() {
        // Check all mandatory fields are filled
        const allFieldsFilled = mandatoryPersonalFields.every(field => (recordData.personal[field] || '').trim() !== '');

        // Validate email field specifically
        let emailValid = true;
        const emailValue = (recordData.personal.email || '').trim();
        if (emailValue) {
            const validation = validateEmail(emailValue);
            emailValid = validation.isValid;
        } else {
            emailValid = false; // Email is mandatory
        }

        const isComplete = allFieldsFilled && emailValid;
        $('#to-questions-btn').prop('disabled', !isComplete);
        return isComplete;
    }

    $('#to-questions-btn').on('click', function () {
        if (checkPersonalInfoCompletion()) {
            $('#personal-info-error').hide();
            currentQuestionIndex = 0; // Ensure we start at question 0
            saveQuestionData({ last_question_index: 0 }); // Save progress
            navigateTo('#question-flow-view');
            renderQuestion();
        } else {
            $('#personal-info-error').text('Please fill in all required fields marked with an asterisk (*).').show();
        }
    });

    function renderQuestion() {
        // Refresh questions array to get updated address labels based on travel country
        questions = getQuestionsWithDynamicAddressFields();

        while (currentQuestionIndex < questions.length && questions[currentQuestionIndex].condition && !questions[currentQuestionIndex].condition(recordData.questions || {}, recordData.personal || {})) {
            currentQuestionIndex++;
        }

        if (currentQuestionIndex >= questions.length) {
            saveQuestionData({ last_question_index: currentQuestionIndex }); // Save final index
            renderSummaryView();
            navigateTo('#summary-view');
            return;
        }

        const container = $('#question-flow-view');
        container.empty();
        const q = questions[currentQuestionIndex];

        // Get applicant's first name for personalization
        const firstName = (recordData.personal || {}).first_name || '';

        let content = `<div class="question-card animated" data-question-id="${q.id}">`;

        // Build dynamic text for bookings question
        let questionText = q.text;
        let questionNote = q.note;

        if (q.id === 'bookings') {
            const qData = recordData.questions || {};
            const pData = recordData.personal || {};

            // Get destination, departure date, and return date
            const destination = qData.primary_destination || 'your primary destination';
            const departureDate = qData.travel_date_from ? formatDateForDisplay(qData.travel_date_from) : '[Not Set]';
            const returnDate = qData.travel_date_to ? formatDateForDisplay(qData.travel_date_to) : '[Not Set]';

            // Build the dynamic question text
            questionText = `Have any of the following been booked? (Flight, Train, travel ticket) to <strong>${destination}</strong><br><br>
                <span style="color: var(--primary-color); font-weight: 500;">
                    <i class="fas fa-plane-departure"></i> Planned Departure Date: <strong>${departureDate}</strong><br>
                    <i class="fas fa-plane-arrival"></i> Planned Return Date: <strong>${returnDate}</strong>
                </span>`;

            questionNote = 'This includes flights, trains, cruises, or any.';
        }

        // Personalize question text
        if (questionText) content += `<p class="question-text">${personalizeText(questionText, firstName)}</p>`;
        if (questionNote) content += `<small class="note">${personalizeText(questionNote, firstName)}</small>`;
        content += buildQuestionInput(q, firstName);

        content += `<div class="navigation-buttons"><button class="btn-secondary back-question-btn"><i class="fas fa-arrow-left"></i> Back</button><button class="btn-primary next-question-btn">Continue <i class="fas fa-arrow-right"></i></button></div>`;

        container.html(content + '</div>');
        postRenderSetup(q);
    }

    function buildQuestionInput(q, firstName = '') {
        const qData = recordData.questions || {};
        const pData = recordData.personal || {};
        let inputHtml = '';

        switch (q.type) {
            case 'text': inputHtml += `<input type="text" class="question-input-group" placeholder="${q.placeholder || 'Type...'}" value="${qData[q.field] || ''}" data-field="${q.field}">`; break;
            case 'group':
                q.fields.forEach(f => {
                    const valueSource = q.table === 'personal' ? pData : qData;
                    let v = valueSource[f.id] || '';
                    const fieldId = `field-${f.id}-${Date.now()}`;
                    inputHtml += `<div class="labeled-input-group">`;
                    if (f.label) inputHtml += `<label class="group-label" for="${fieldId}">${f.label}</label>`;
                    if (f.type === 'select') {
                        inputHtml += `<select id="${fieldId}" class="question-input-group select2-input" data-field="${f.id}"><option></option>${f.options.map(opt => `<option value="${opt}" ${v === opt ? 'selected' : ''}>${opt}</option>`).join('')}</select>`;
                    } else {
                        inputHtml += `<input id="${fieldId}" type="${f.type || 'text'}" class="question-input-group" placeholder="${f.placeholder || ''}" value="${v}" data-field="${f.id}">`;
                    }
                    // Add validation hint for place name fields
                    if (f.validate === 'place_name') {
                        inputHtml += `<small class="validation-hint">No spaces at start, no double spaces, no periods or commas</small>`;
                    }
                    inputHtml += `</div>`;
                });
                break;
            case 'radio':
                inputHtml += `<div class="radio-group">${q.options.map(opt => {
                    const isChecked = qData[q.field] === opt;
                    return `<label class="${isChecked ? 'selected' : ''}"><input type="radio" name="${q.id}" value="${opt}" ${isChecked ? 'checked' : ''}>${opt}</label>`;
                }).join('')}</div>`;
                break;
            case 'radio-with-upload':
                // Radio buttons for the main question
                inputHtml += `<div class="radio-group">${q.options.map(opt => {
                    const isChecked = qData[q.field] === opt;
                    return `<label class="${isChecked ? 'selected' : ''}"><input type="radio" name="${q.id}" value="${opt}" ${isChecked ? 'checked' : ''}>${opt}</label>`;
                }).join('')}</div>`;

                // Conditional file upload section (shown when "Yes" is selected)
                let uploadFiles = [];
                if (Array.isArray(qData[q.uploadField])) {
                    uploadFiles = qData[q.uploadField];
                } else if (typeof qData[q.uploadField] === 'string' && qData[q.uploadField]) {
                    try { uploadFiles = JSON.parse(qData[q.uploadField]); } catch (e) { uploadFiles = []; }
                }
                const uploadFileList = createFileList(uploadFiles, q.uploadField);
                const showUpload = qData[q.field] === 'Yes';

                // Check if country is Germany or Switzerland
                const travelCountry = (pData.travel_country || '').toLowerCase();
                const isGermanyOrSwitzerland = travelCountry === 'germany' || travelCountry === 'switzerland';
                const showWarning = qData[q.field] === 'No' && q.id === 'bookings' && !isGermanyOrSwitzerland;

                // Add warning section for bookings question when "No" is selected (except for Germany/Switzerland)
                if (q.id === 'bookings') {
                    inputHtml += `
                        <div class="booking-warning-section" id="${q.id}-warning-section" style="display: ${showWarning ? 'block' : 'none'}; margin-top: 20px;">
                            <div class="warning-box" style="background-color: #fff3cd; border: 2px solid #ffc107; padding: 20px; border-radius: 8px;">
                                <h4 style="margin: 0 0 15px 0; color: #856404; font-size: 1.2rem; display: flex; align-items: center; gap: 10px;">
                                    <i class="fas fa-exclamation-triangle"></i> Important Notice
                                </h4>
                                <p style="margin: 0 0 15px 0; color: #856404; line-height: 1.6; font-weight: 500;">
                                    The Embassy and the VFS/TLS Visa Centers have updated their requirements for visa applications. <strong>Only fully paid flight tickets will be accepted.</strong> Dummy bookings or partially paid flight reservations will no longer be considered valid and may result in application rejection.
                                </p>
                                <p style="margin: 0 0 15px 0; color: #856404; line-height: 1.6;">
                                    Applicants are strongly advised to submit fully paid flight tickets with their visa applications.
                                </p>
                                <p style="margin: 0 0 10px 0; color: #856404; line-height: 1.6; font-weight: 500;">
                                    For greater flexibility, some platforms offer refundable options, including:
                                </p>
                                <ul style="margin: 0 0 10px 20px; color: #856404; line-height: 1.8;">
                                    <li><strong>Flights:</strong> <a href="https://www.kiwi.com" target="_blank" style="color: #0056b3; text-decoration: underline;">kiwi.com</a></li>
                                    <li><strong>Trains:</strong> <a href="https://www.eurostar.com" target="_blank" style="color: #0056b3; text-decoration: underline;">Eurostar</a></li>
                                </ul>
                            </div>
                        </div>`;
                }

                inputHtml += `
                    <div class="conditional-upload-section" id="${q.id}-upload-section" style="display: ${showUpload ? 'block' : 'none'}; margin-top: 20px;">
                        <div class="upload-label-section">
                            <h4 style="margin: 0 0 10px 0; color: var(--text-dark); font-size: 1.1rem;">${q.uploadLabel}</h4>
                            <p class="note" style="margin: 5px 0 15px 0;">${q.uploadNote}</p>
                        </div>
                        <div class="file-upload-wrapper" data-field="${q.uploadField}">
                            <input type="file" id="${q.uploadField}-upload" class="file-input" name="${q.uploadInputName}" accept="image/png, image/jpeg, application/pdf" multiple>
                            <label for="${q.uploadField}-upload" class="file-label btn-secondary"><i class="fas fa-upload"></i> Choose Files</label>
                            <div class="file-status"></div>
                            <div class="image-preview" ${uploadFiles.length === 0 ? 'style="display:none"' : ''}>
                                <ul class="file-list">${uploadFileList}</ul>
                            </div>
                        </div>
                    </div>`;
                break;
            case 'file':
                // FIX: Properly handle file arrays from database JSON
                let files = [];
                if (Array.isArray(qData[q.field])) {
                    files = qData[q.field];
                } else if (typeof qData[q.field] === 'string' && qData[q.field]) {
                    try { files = JSON.parse(qData[q.field]); } catch (e) { files = []; }
                }

                const fileList = createFileList(files, q.field); // FIX 2: Renamed from createFileListt
                inputHtml = `
                <div class="file-upload-wrapper" data-field="${q.field}">
                    <input type="file" id="${q.field}-upload" class="file-input" name="${q.inputName}" accept="${q.accept || 'image/png, image/jpeg, application/pdf'}" multiple>
                    <label for="${q.field}-upload" class="file-label btn-secondary"><i class="fas fa-upload"></i> Choose Files</label>
                    <div class="file-status"></div>
                    <div class="image-preview" ${files.length === 0 ? 'style="display:none"' : ''}>
                        <ul class="file-list">${fileList}</ul>
                    </div>
                </div>`;
                break;

            case 'grouped-select': inputHtml += `<select class="question-input select2-input" data-field="${q.field}"></select>`; break;
            case 'sponsor-details':
                inputHtml += `<div class="radio-group sponsor-options">
                    <label class="${qData.travel_covered_by === 'Myself' ? 'selected' : ''}"><input type="radio" name="travel_covered_by" value="Myself" ${qData.travel_covered_by === 'Myself' ? 'checked' : ''}> Myself</label>
                    <label class="${qData.travel_covered_by === 'Family Member / Family Member in the EU' ? 'selected' : ''}"><input type="radio" name="travel_covered_by" value="Family Member / Family Member in the EU" ${qData.travel_covered_by === 'Family Member / Family Member in the EU' ? 'checked' : ''}> Family Member</label>
                    <label class="${qData.travel_covered_by === 'Host / Company / Organisation' ? 'selected' : ''}"><input type="radio" name="travel_covered_by" value="Host / Company / Organisation" ${qData.travel_covered_by === 'Host / Company / Organisation' ? 'checked' : ''}> Host / Company</label>
                </div><div id="sponsor-details-container"></div>`;
                break;
            case 'confirm-dates':
                inputHtml += `<div class="confirmation-section"><p><strong>Planned Departure:</strong> ${formatDateForDisplay(qData.travel_date_from)}</p><p><strong>Planned Return:</strong> ${formatDateForDisplay(qData.travel_date_to)}</p><label class="confirmation-label" for="dates-confirmed"><input type="checkbox" id="dates-confirmed"> Yes, I confirm these dates are correct.</label></div>`;
                break;
            case 'accommodation':
                const visaType = pData.visa_type || '';
                if (visaType.toLowerCase().includes('tourist')) inputHtml += `<h4>🧳 Tourism</h4><div class="accommodation-subsection" data-stay-type="Tourism">${buildAddressFields('hotel', qData, true)}</div>`;
                else if (visaType.toLowerCase().includes('family') || visaType.toLowerCase().includes('friend')) inputHtml += `<h4>👨‍👩‍👧‍👦 Visiting Family/Friends</h4><div class="accommodation-subsection" data-stay-type="Family/Friend Visit">
<input type="text" class="question-input-group" placeholder="Inviting Person’s First Name *" data-field="inviting_person_first_name" value="${qData.inviting_person_first_name || ''}">
<input type="text" class="question-input-group" placeholder="Inviting Person’s Surname *" data-field="inviting_person_surname" value="${qData.inviting_person_surname || ''}">
<input type="email" class="question-input-group" placeholder="Inviting Person’s Email ID *" data-field="inviting_person_email" value="${qData.inviting_person_email || ''}">
<div style="display: flex; gap: 10px; max-width: 450px; margin: 0 auto 15px auto;">
    <input type="text" class="question-input-group" placeholder="Code *" data-field="inviting_person_phone_code" value="${qData.inviting_person_phone_code || ''}" style="width: 100px; margin-bottom: 0;">
    <input type="tel" class="question-input-group" placeholder="Inviting Person’s Phone *" data-field="inviting_person_phone" value="${qData.inviting_person_phone || ''}" style="flex-grow: 1; margin-bottom: 0;">
</div>
<input type="text" class="question-input-group" placeholder="Relationship to ${firstName || 'Applicant'} *" data-field="inviting_person_relationship" value="${qData.inviting_person_relationship || ''}">${buildAddressFields('inviting_person', qData)}</div>`;
                else if (visaType.toLowerCase().includes('business')) inputHtml += `<h4>💼 Business Visit</h4><div class="accommodation-subsection" data-stay-type="Business"><input type="text" class="question-input-group" placeholder="Company Name *" data-field="inviting_company_name" value="${qData.inviting_company_name || ''}"><input type="text" class="question-input-group" placeholder="Contact Person *" data-field="inviting_company_contact_person" value="${qData.inviting_company_contact_person || ''}">${buildAddressFields('inviting_company', qData)}<input type="tel" class="question-input-group" placeholder="Company Phone *" data-field="inviting_company_phone" value="${qData.inviting_company_phone || ''}"></div>`;
                else inputHtml += `<div class="note">Could not determine accommodation type. Please contact support.</div>`;
                break;
            case 'evisa-details':
                const nameForEvisa = firstName || 'the applicant';
                const possessiveName = firstName ? `${firstName}'s` : 'the applicant\'s';
                const evisaInfo = `
                    <div class="info-box" style="background-color: #eef2ff; border: 1px solid #c7d2fe; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 0.9rem;">
                        <p style="margin: 0; font-weight: 600; color: var(--primary-color); display: flex; align-items: center; gap: 8px;"><i class="fas fa-info-circle"></i> How to find ${possessiveName} eVisa dates:</p>
                        <ol style="margin: 10px 0 0 20px; padding-left: 20px; line-height: 1.6;">
                            <li><strong>Option 1: On ${possessiveName} eVisa PDF or digital status</strong>
                                <ul style="list-style-type: disc; margin-left: 20px; padding-left: 0;">
                                    <li>Go to: <a href="https://gov.uk/view-prove-immigration-status" target="_blank" style="color: var(--primary-color); font-weight: 500;">gov.uk/view-prove-immigration-status</a></li>
                                    <li>Sign in using the same document used for the visa (passport, BRP, or national ID) and registered email</li>
                                    <li>View visa type, issue date ("Visa start date"), and expiry date clearly listed</li>
                                </ul>
                            </li>
                            <li style="margin-top: 10px;"><strong>Option 2: On ${possessiveName} visa decision letter/email</strong>
                                <ul style="list-style-type: disc; margin-left: 20px; padding-left: 0;">
                                    <li>Check approval email or letter (PDF) for: "Your visa is valid from [Date] until [Date]"</li>
                                </ul>
                            </li>
                        </ol>
                        <div style="margin-top: 15px; text-align: center;">
                            <a href="#" class="evisa-example-link" style="color: var(--primary-color); font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; background: white; border-radius: 6px; border: 1px solid var(--primary-color);">
                                <i class="fas fa-image"></i> See what an eVisa looks like
                            </a>
                        </div>
                    </div>
                    
                    <!-- eVisa Example Modal -->
                    <div class="evisa-example-modal" style="display: none;">
                        <div class="evisa-example-backdrop">
                            <div class="evisa-example-content">
                                <button class="evisa-example-close">&times;</button>
                                <h4 style="margin: 0 0 15px 0; color: var(--primary-color);">Example: UK eVisa</h4>
                                <img src="https://l.visad.co.uk/IMG/evisa_model.jpeg" alt="eVisa Example" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                                <p style="margin-top: 10px; font-size: 0.85rem; color: #666;">This is what a UK eVisa typically looks like. Look for the dates shown in your digital status.</p>
                            </div>
                        </div>
                    </div>
                `;
                inputHtml += evisaInfo;
                inputHtml += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; max-width: 450px; margin: 0 auto 15px auto;">';
                inputHtml += `<div class="labeled-input-group" style="max-width: none; margin: 0;"><label class="group-label" for="field-evisa_issue_date">eVisa Issue Date</label><input id="field-evisa_issue_date" type="date" class="question-input-group" data-field="evisa_issue_date" value="${qData.evisa_issue_date || ''}"></div>`;
                inputHtml += `<div class="labeled-input-group" style="max-width: none; margin: 0;"><label class="group-label" for="field-evisa_expiry_date">eVisa Expiry Date</label><input id="field-evisa_expiry_date" type="date" class="question-input-group" data-field="evisa_expiry_date" value="${qData.evisa_expiry_date || ''}"></div>`;
                inputHtml += '</div>';

                // NEW: Conditional display for settled status
                const datesEntered = (qData.evisa_issue_date || '') !== '' && (qData.evisa_expiry_date || '') !== '';
                inputHtml += `<div class="confirmation-section" id="evisa-settled-wrapper" style="max-width: 450px; margin: 0 auto 20px auto; padding: 10px; background: none; border: none; ${datesEntered ? 'display: none;' : ''}">
                                <label class="confirmation-label" for="field-evisa_no_date_settled">
                                    <input type="checkbox" id="field-evisa_no_date_settled" data-field="evisa_no_date_settled" ${qData.evisa_no_date_settled === 'Yes' ? 'checked' : ''}>
                                    No date found - This is showing settled status
                                </label>
                            </div>`;

                const evisaFileField = q.fields.find(f => f.id === 'evisa_document_path');
                // OLD: const evisaFiles = Array.isArray(qData[evisaFileField.id]) ? qData[evisaFileField.id] : [];
                // FIX: Use the file retrieval helper function
                const evisaFiles = getUploadedFiles(evisaFileField.id);
                const evisaFileList = createFileList(evisaFiles, evisaFileField.id); // FIX 2: Renamed from createFileListt
                inputHtml += `
    <div class="file-upload-wrapper" data-field="evisa_document_path">
     <label style="font-weight: 600; margin-bottom: 8px; display: block; color: var(--text-dark); text-align: center">Upload eVisa (Screenshot or PDF)</label>
                    <input type="file" id="${evisaFileField.id}-upload" class="file-input" name="${evisaFileField.inputName}" accept multiple>
                    <label for="${evisaFileField.id}-upload" class="file-label btn-secondary"><i class="fas fa-upload"></i> Choose Files</label>
                    <div class="file-status"></div>

        <div class="image-preview" ${evisaFiles.length === 0 ? 'style="display:none"' : ''}>
            <ul class="file-list">${evisaFileList}</ul>
        </div>
    </div>`;

                break;
            case 'share-code-details':
                const shareCodeInfo = `
                    <div class="info-box" style="background-color: #eef2ff; border: 1px solid #c7d2fe; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 0.9rem;">
                        <p style="margin: 0; font-weight: 600; color: var(--primary-color); display: flex; align-items: center; gap: 8px;"><i class="fas fa-info-circle"></i> How to get your Share Code:</p>
                        <ol style="margin: 10px 0 0 20px; padding-left: 20px; line-height: 1.6;">
                            <li>Go to the official UK government website: <a href="https://gov.uk/view-prove-immigration-status" target="_blank" style="color: var(--primary-color); font-weight: 500;">gov.uk/view-prove-immigration-status</a></li>
                            <li>Sign in using your details (BRP, passport, or biometric residence card)</li>
                            <li>Choose the option to share your immigration status</li>
                        </ol>
                        <div style="margin-top: 15px; text-align: center; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                            <a href="#" class="sharecode-download-link" style="color: var(--primary-color); font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; background: white; border-radius: 6px; border: 1px solid var(--primary-color);">
                                <i class="fas fa-download"></i> How to download Share Code PDF
                            </a>
                            <a href="#" class="sharecode-example-link" style="color: var(--primary-color); font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; background: white; border-radius: 6px; border: 1px solid var(--primary-color);">
                                <i class="fas fa-image"></i> See what a Share Code looks like
                            </a>
                        </div>
                    </div>
                    
                    <!-- Share Code Download Guide Modal -->
                    <div class="sharecode-download-modal" style="display: none;">
                        <div class="sharecode-modal-backdrop">
                            <div class="sharecode-modal-content">
                                <button class="sharecode-modal-close">&times;</button>
                                <h4 style="margin: 0 0 15px 0; color: var(--primary-color);">How to Download Share Code PDF</h4>
                                <img src="https://l.visad.co.uk/IMG/share_code_model_downlaod.jpeg" alt="How to Download Share Code" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                                <p style="margin-top: 10px; font-size: 0.85rem; color: #666;">Follow these steps to download your Share Code as a PDF from the UK government website.</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Share Code Example Modal -->
                    <div class="sharecode-example-modal" style="display: none;">
                        <div class="sharecode-modal-backdrop">
                            <div class="sharecode-modal-content">
                                <button class="sharecode-modal-close">&times;</button>
                                <h4 style="margin: 0 0 15px 0; color: var(--primary-color);">Example: UK Share Code</h4>
                                <img src="https://l.visad.co.uk/IMG/share_code_model.jpeg" alt="Share Code Example" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                                <p style="margin-top: 10px; font-size: 0.85rem; color: #666;">This is what your Share Code document typically looks like. Look for the 9-character code.</p>
                            </div>
                        </div>
                    </div>
                `;
                inputHtml += shareCodeInfo;
                inputHtml += `<div class="labeled-input-group"><label class="group-label" for="field-share_code">Enter Share Code</label><input id="field-share_code" type="text" class="question-input-group" placeholder="Enter your immigration share code" data-field="share_code" value="${qData.share_code || ''}"></div>`;
                inputHtml += `<div class="labeled-input-group"><label class="group-label" for="field-share_code_expiry_date">Share Code Expiry Date</label><input id="field-share_code_expiry_date" type="date" class="question-input-group" data-field="share_code_expiry_date" value="${qData.share_code_expiry_date || ''}"></div>`;

                const shareCodeFileField = q.fields.find(f => f.id === 'share_code_document_path');
                // OLD: const shareCodeFiles = Array.isArray(qData[shareCodeFileField.id]) ? qData[shareCodeFileField.id] : [];
                // FIX: Use the file retrieval helper function
                const shareCodeFiles = getUploadedFiles(shareCodeFileField.id);
                const shareCodeFileList = createFileList(shareCodeFiles, shareCodeFileField.id); // FIX 2: Renamed from createFileListt
                inputHtml += `
    <div class="file-upload-wrapper" data-field="share_code_document_path">
     <label style="font-weight: 600; margin-bottom: 8px; display: block; color: var(--text-dark); text-align: center">Upload Share Code Document (PDF format)</label>
                    <input type="file" id="${shareCodeFileField.id}-upload" class="file-input" name="${shareCodeFileField.inputName}" accept="${shareCodeFileField.accept}" multiple>
                    <label for="${shareCodeFileField.id}-upload" class="file-label btn-secondary"><i class="fas fa-upload"></i> Choose PDF Files</label>
                    <div class="file-status"></div>
    
        <div class="image-preview" ${shareCodeFiles.length === 0 ? 'style="display:none"' : ''}>
            <ul class="file-list">${shareCodeFileList}</ul>
        </div>
    </div>`;

                break;
        }
        return inputHtml;
    }

    function buildAddressFields(prefix, data, isHotel = false) {
        const travelCountry = recordData.personal?.travel_country || '';
        const isGermany = travelCountry.toLowerCase() === 'germany';

        if (isGermany) {
            return `
                ${isHotel ? `<div class="labeled-input-group"><label class="group-label" for="${prefix}_name">Hotel Name *</label><input id="${prefix}_name" type="text" class="question-input-group" placeholder="e.g., Hotel Berlin" data-field="${prefix}_name" value="${data[prefix + '_name'] || ''}"></div>` : ''}
                <div class="labeled-input-group"><label class="group-label" for="${prefix}_address_1">House Number *</label><input id="${prefix}_address_1" type="text" class="question-input-group" placeholder="e.g., 123" data-field="${prefix}_address_1" value="${data[prefix + '_address_1'] || ''}"></div>
                <div class="labeled-input-group"><label class="group-label" for="${prefix}_address_2">Street *</label><input id="${prefix}_address_2" type="text" class="question-input-group" placeholder="e.g., Hauptstraße" data-field="${prefix}_address_2" value="${data[prefix + '_address_2'] || ''}"></div>
                <div class="labeled-input-group"><label class="group-label" for="${prefix}_city">City *</label><input id="${prefix}_city" type="text" class="question-input-group" placeholder="e.g., Berlin" data-field="${prefix}_city" value="${data[prefix + '_city'] || ''}"></div>
                <div class="labeled-input-group"><label class="group-label" for="${prefix}_state">State/Province *</label><input id="${prefix}_state" type="text" class="question-input-group" placeholder="e.g., Berlin" data-field="${prefix}_state" value="${data[prefix + '_state'] || ''}"></div>
                <div class="labeled-input-group"><label class="group-label" for="${prefix}_zip">Postal Code *</label><input id="${prefix}_zip" type="text" class="question-input-group" placeholder="e.g., 10115" data-field="${prefix}_zip" value="${data[prefix + '_zip'] || ''}"></div>
                ${isHotel ? `<div class="labeled-input-group"><label class="group-label" for="${prefix}_contact_number">Hotel Contact Number *</label><input id="${prefix}_contact_number" type="text" class="question-input-group" placeholder="e.g., +49 30 1234567" data-field="${prefix}_contact_number" value="${data[prefix + '_contact_number'] || ''}"></div><div class="labeled-input-group"><label class="group-label" for="${prefix}_booking_reference">Booking Reference (Optional)</label><input id="${prefix}_booking_reference" type="text" class="question-input-group" placeholder="e.g., BK123456" data-field="${prefix}_booking_reference" value="${data[prefix + '_booking_reference'] || ''}"></div>` : ''}`;
        } else {
            return `
                ${isHotel ? `<div class="labeled-input-group"><label class="group-label" for="${prefix}_name">Hotel Name *</label><input id="${prefix}_name" type="text" class="question-input-group" placeholder="e.g., Grand Hotel" data-field="${prefix}_name" value="${data[prefix + '_name'] || ''}"></div>` : ''}
                <div class="labeled-input-group"><label class="group-label" for="${prefix}_address_1">Address Line 1 *</label><input id="${prefix}_address_1" type="text" class="question-input-group" placeholder="e.g., 123 Main Street" data-field="${prefix}_address_1" value="${data[prefix + '_address_1'] || ''}"></div>
                <div class="labeled-input-group"><label class="group-label" for="${prefix}_address_2">Address Line 2</label><input id="${prefix}_address_2" type="text" class="question-input-group" placeholder="e.g., Apartment 4B" data-field="${prefix}_address_2" value="${data[prefix + '_address_2'] || ''}"></div>
                <div class="labeled-input-group"><label class="group-label" for="${prefix}_city">City *</label><input id="${prefix}_city" type="text" class="question-input-group" placeholder="e.g., London" data-field="${prefix}_city" value="${data[prefix + '_city'] || ''}"></div>
                <div class="labeled-input-group"><label class="group-label" for="${prefix}_state">State/Province *</label><input id="${prefix}_state" type="text" class="question-input-group" placeholder="e.g., England" data-field="${prefix}_state" value="${data[prefix + '_state'] || ''}"></div>
                <div class="labeled-input-group"><label class="group-label" for="${prefix}_zip">Postal Code *</label><input id="${prefix}_zip" type="text" class="question-input-group" placeholder="e.g., SW1A 1AA" data-field="${prefix}_zip" value="${data[prefix + '_zip'] || ''}"></div>
                ${isHotel ? `<div class="labeled-input-group"><label class="group-label" for="${prefix}_contact_number">Hotel Contact Number *</label><input id="${prefix}_contact_number" type="text" class="question-input-group" placeholder="e.g., +44 20 1234 5678" data-field="${prefix}_contact_number" value="${data[prefix + '_contact_number'] || ''}"></div><div class="labeled-input-group"><label class="group-label" for="${prefix}_booking_reference">Booking Reference (Optional)</label><input id="${prefix}_booking_reference" type="text" class="question-input-group" placeholder="e.g., BK123456" data-field="${prefix}_booking_reference" value="${data[prefix + '_booking_reference'] || ''}"></div>` : ''}`;
        }
    }

    function postRenderSetup(q) {
        const isMobile = $(window).width() <= 768;
        $('.select2-input').each(function () {
            const $this = $(this);
            $this.select2({
                placeholder: 'Select an option',
                width: '100%',
                allowClear: true,
                dropdownAutoWidth: false,
                minimumResultsForSearch: 5,
                dropdownParent: $this.parent()
            });

            // Prevent scroll jump on mobile when dropdown opens
            if (isMobile) {
                $this.on('select2:open', function () {
                    const scrollTop = $(window).scrollTop();
                    setTimeout(function () {
                        $(window).scrollTop(scrollTop);
                        const searchField = $('.select2-search__field');
                        if (searchField.length) {
                            searchField[0].focus({ preventScroll: true });
                        }
                    }, 10);
                });
            }
        });
        if (q.type === 'grouped-select') renderDestinationSelect2(recordData.questions[q.field] || '');
        if (q.id === 'travel_sponsor') renderSponsorDetails(recordData.questions.travel_covered_by);

        $('.radio-group input[type="radio"]').on('change', function () {
            const group = $(this).closest('.radio-group');
            group.find('label').removeClass('selected');
            $(this).closest('label').addClass('selected');
            if ($(this).attr('name') === 'travel_covered_by') {
                renderSponsorDetails($(this).val());
            }

            // Handle radio-with-upload type (fingerprints question)
            if (q.type === 'radio-with-upload') {
                const selectedValue = $(this).val();
                const uploadSection = $(`#${q.id}-upload-section`);
                const warningSection = $(`#${q.id}-warning-section`);

                if (selectedValue === 'Yes') {
                    // Check if file collection logic is supported for this question
                    const unsupportedUploads = [];
                    if (unsupportedUploads.includes(q.uploadField)) {
                        // Unsupported: Show warning instead of upload
                        uploadSection.slideUp();
                        const warningId = `${q.id}-unsupported-warning`;
                        if ($(`#${warningId}`).length === 0) {
                            $(`#${q.id}-warning-section`).after(`<div id="${warningId}" class="warning-box" style="background-color:#ffeeba; padding:10px; margin-top:10px; border-radius:4px; color:#856404;">Upload for this item is currently unavailable in the new system. Please continue without uploading.</div>`);
                        }
                    } else {
                        uploadSection.slideDown(300);
                        if (warningSection.length) {
                            warningSection.slideUp(300);
                        }
                    }
                } else {
                    uploadSection.slideUp(300);
                    // Show warning for bookings question when "No" is selected (except for Germany/Switzerland)
                    if (q.id === 'bookings' && warningSection.length) {
                        const travelCountry = (recordData.personal?.travel_country || '').toLowerCase();
                        const isGermanyOrSwitzerland = travelCountry === 'germany' || travelCountry === 'switzerland';

                        if (!isGermanyOrSwitzerland) {
                            warningSection.slideDown(300);
                        }
                    }
                }
                checkQuestionCompletion();
            }
        });

        // Add email validation to all email input fields in the question card
        $('.question-card input[type="email"]').each(function () {
            addEmailValidation($(this));
        });

        // eVisa example modal handlers
        $('.evisa-example-link').on('click', function (e) {
            e.preventDefault();
            $('.evisa-example-modal').fadeIn(300);
        });

        $('.evisa-example-close, .evisa-example-backdrop').on('click', function (e) {
            if (e.target === this) {
                $('.evisa-example-modal').fadeOut(300);
            }
        });

        // Share Code download guide modal handlers
        $('.sharecode-download-link').on('click', function (e) {
            e.preventDefault();
            $('.sharecode-download-modal').fadeIn(300);
        });

        // Share Code example modal handlers
        $('.sharecode-example-link').on('click', function (e) {
            e.preventDefault();
            $('.sharecode-example-modal').fadeIn(300);
        });

        $('.sharecode-modal-close, .sharecode-modal-backdrop').on('click', function (e) {
            if (e.target === this) {
                $('.sharecode-download-modal, .sharecode-example-modal').fadeOut(300);
            }
        });

        // Close modal on Escape key
        $(document).on('keydown', function (e) {
            if (e.key === 'Escape') {
                if ($('.evisa-example-modal').is(':visible')) {
                    $('.evisa-example-modal').fadeOut(300);
                }
                if ($('.sharecode-download-modal').is(':visible')) {
                    $('.sharecode-download-modal').fadeOut(300);
                }
                if ($('.sharecode-example-modal').is(':visible')) {
                    $('.sharecode-example-modal').fadeOut(300);
                }
            }
        });

        checkQuestionCompletion();
        $('.question-card').find('input, select, textarea').on('input change', checkQuestionCompletion);

        // Auto-scroll to question on mobile after rendering
        setTimeout(function () {
            scrollToQuestion();
        }, 150);

        // Date validation and recommendations are now handled in checkQuestionCompletion
        // Keeping date change listener only for saving values
        if (q.id === 'travel_dates') {
            $('[data-field="travel_date_from"], [data-field="travel_date_to"]').on('change', function () {
                // Save the dates immediately so they're available for validation
                const field = $(this).data('field');
                const value = $(this).val();
                if (!recordData.questions) recordData.questions = {};
                recordData.questions[field] = value;
            });
        }

        // NEW: Display recommendation on confirm dates page
        if (q.id === 'travel_dates_confirm') {
            const qData = recordData.questions || {};
            if (qData.travel_date_from) {
                const questionCard = $('.question-card');
                if (qData.travel_date_to) {
                    const duration = calculateTripDuration(qData.travel_date_from, qData.travel_date_to);
                    displayDateRecommendation(duration, qData, questionCard, qData.travel_date_from);
                } else {
                    // Show only departure date warning
                    displayDateRecommendation(0, qData, questionCard, qData.travel_date_from);
                }
            }
        }

        // Re-validate eVisa if travel dates are set and we're on travel_dates question
        if (q.id === 'travel_dates') {
            $('[data-field="travel_date_from"], [data-field="travel_date_to"]').on('change', function () {
                // Save the dates immediately so they're available for validation
                const field = $(this).data('field');
                const value = $(this).val();
                if (!recordData.questions) recordData.questions = {};
                recordData.questions[field] = value;
            });
        }

        // NEW: Listener for eVisa date fields
        if (q.id === 'evisa_details') {
            $('#field-evisa_issue_date, #field-evisa_expiry_date').on('change', function () {
                const issueDate = $('#field-evisa_issue_date').val();
                const expiryDate = $('#field-evisa_expiry_date').val();
                if (issueDate && expiryDate) {
                    $('#evisa-settled-wrapper').slideUp();
                    $('#field-evisa_no_date_settled').prop('checked', false); // Uncheck it
                } else {
                    $('#evisa-settled-wrapper').slideDown();
                }

                // Validate eVisa expiry against return date
                if (expiryDate) {
                    const returnDate = recordData.questions?.travel_date_to;
                    if (returnDate) {
                        const validation = validateEvisaExpiry(expiryDate, returnDate);
                        if (!validation.isValid) {
                            // Show warning
                            let warningDiv = $('#evisa-expiry-warning');
                            if (warningDiv.length === 0) {
                                warningDiv = $('<div id="evisa-expiry-warning" class="date-warning warning"></div>');
                                $('#field-evisa_expiry_date').after(warningDiv);
                            }
                            warningDiv.html(validation.message).slideDown();
                        } else {
                            $('#evisa-expiry-warning').slideUp();
                        }
                    }
                }

                checkQuestionCompletion(); // Re-check completion
            });
        }

        if (q.id === 'share_code_details') {
            $('#field-share_code_expiry_date').on('change', function () {
                const expiryDate = $(this).val();

                // Validate Share Code expiry
                if (expiryDate) {
                    const validation = validateShareCodeExpiry(expiryDate);
                    if (!validation.isValid) {
                        // Show warning
                        let warningDiv = $('#share-code-expiry-warning');
                        if (warningDiv.length === 0) {
                            warningDiv = $('<div id="share-code-expiry-warning" class="date-warning warning"></div>');
                            $(this).after(warningDiv);
                        }
                        warningDiv.html(validation.message).slideDown();
                    } else {
                        $('#share-code-expiry-warning').slideUp();
                    }
                }

                checkQuestionCompletion(); // Re-check completion
            });
        }
    }

    function renderSponsorDetails(selection) {
        const container = $('#sponsor-details-container');
        const qData = recordData.questions || {};
        let detailsHtml = '';
        if (selection === 'Family Member / Family Member in the EU') {
            const relations = ['Spouse / Civil Partner', 'Parent(s)', 'Sibling'];
            detailsHtml = `<div class="labeled-input-group"><label class="group-label" for="sponsor_relation">Select Relation *</label><select id="sponsor_relation" class="question-input-group" data-field="sponsor_relation"><option value="">Select Relation *</option>${relations.map(r => `<option value="${r}" ${qData.sponsor_relation === r ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
            <div class="labeled-input-group"><label class="group-label" for="sponsor_full_name">Full Name *</label><input id="sponsor_full_name" type="text" class="question-input-group" placeholder="e.g., John Smith" data-field="sponsor_full_name" value="${qData.sponsor_full_name || ''}"></div>${buildAddressFields('sponsor', qData)}<div class="labeled-input-group"><label class="group-label" for="sponsor_email">Email *</label><input id="sponsor_email" type="email" class="question-input-group" placeholder="e.g., john@example.com" data-field="sponsor_email" value="${qData.sponsor_email || ''}"></div><div class="labeled-input-group"><label class="group-label" for="sponsor_phone">Phone *</label><input id="sponsor_phone" type="tel" class="question-input-group" placeholder="e.g., +44 20 1234 5678" data-field="sponsor_phone" value="${qData.sponsor_phone || ''}"></div>`;
        } else if (selection === 'Host / Company / Organisation') {
            detailsHtml = `<div class="labeled-input-group"><label class="group-label" for="host_name">Host / Inviting Person Name *</label><input id="host_name" type="text" class="question-input-group" placeholder="e.g., Jane Doe" data-field="host_name" value="${qData.host_name || ''}"></div><div class="labeled-input-group"><label class="group-label" for="host_phone">Host Contact Number *</label><input id="host_phone" type="tel" class="question-input-group" placeholder="e.g., +49 30 1234567" data-field="host_phone" value="${qData.host_phone || ''}"></div><div class="labeled-input-group"><label class="group-label" for="host_company_name">Company / Organisation Name *</label><input id="host_company_name" type="text" class="question-input-group" placeholder="e.g., ABC Company Ltd" data-field="host_company_name" value="${qData.host_company_name || ''}"></div>${buildAddressFields('host', qData)}<div class="labeled-input-group"><label class="group-label" for="host_email">Email *</label><input id="host_email" type="email" class="question-input-group" placeholder="e.g., contact@company.com" data-field="host_email" value="${qData.host_email || ''}"></div><div class="labeled-input-group"><label class="group-label" for="host_company_phone">Phone *</label><input id="host_company_phone" type="tel" class="question-input-group" placeholder="e.g., +49 30 7654321" data-field="host_company_phone" value="${qData.host_company_phone || ''}"></div>`;
        }
        container.html(detailsHtml).find('input, select').on('input change', checkQuestionCompletion);
        checkQuestionCompletion();
    }

    /**
     * Validate place name field (no leading spaces, double spaces, periods, or commas)
     * @param {string} value - The value to validate
     * @returns {boolean} - True if valid, false otherwise
     */
    function validatePlaceName(value) {
        if (!value) return false;

        // Check for leading space
        if (value.startsWith(' ')) return false;

        // Check for double spaces
        if (value.includes('  ')) return false;

        // Check for period or comma
        if (value.includes('.') || value.includes(',')) return false;

        return true;
    }

    /**
     * Validate eVisa expiry date (must be valid for 3 months after return date)
     * @param {string} evisaExpiryDate - eVisa expiry date in YYYY-MM-DD format
     * @param {string} returnDate - Planned return date in YYYY-MM-DD format
     * @returns {object} { isValid: boolean, message: string }
     */
    function validateEvisaExpiry(evisaExpiryDate, returnDate) {
        if (!evisaExpiryDate || !returnDate) return { isValid: true, message: '' };

        const expiry = new Date(evisaExpiryDate);
        expiry.setHours(0, 0, 0, 0);

        const returnDateObj = new Date(returnDate);
        returnDateObj.setHours(0, 0, 0, 0);

        // Calculate 3 months after return date
        const threeMonthsAfterReturn = new Date(returnDateObj);
        threeMonthsAfterReturn.setMonth(threeMonthsAfterReturn.getMonth() + 3);

        if (expiry < threeMonthsAfterReturn) {
            return {
                isValid: false,
                message: '<strong>⚠️ eVisa Expiry Warning</strong><br><br>Please renew your UK E-visa or Contact Visa Support Team Soon.<br><br>Your eVisa should be valid for at least 3 months after your planned return date.'
            };
        }

        return { isValid: true, message: '' };
    }

    /**
     * Validate Share Code expiry date (must be valid for 2 months from today)
     * @param {string} shareCodeExpiryDate - Share code expiry date in YYYY-MM-DD format
     * @returns {object} { isValid: boolean, message: string }
     */
    function validateShareCodeExpiry(shareCodeExpiryDate) {
        if (!shareCodeExpiryDate) return { isValid: true, message: '' };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const expiry = new Date(shareCodeExpiryDate);
        expiry.setHours(0, 0, 0, 0);

        // Calculate 2 months from today
        const twoMonthsFromToday = new Date(today);
        twoMonthsFromToday.setMonth(twoMonthsFromToday.getMonth() + 2);

        if (expiry < twoMonthsFromToday) {
            return {
                isValid: false,
                message: '<strong>⚠️ Share Code Expiring Soon</strong><br><br>Please get a new share code because the share code is expiring.<br><br>Your share code should be valid for at least 2 months from today.'
            };
        }

        return { isValid: true, message: '' };
    }

    function checkQuestionCompletion() {
        const q = questions[currentQuestionIndex];
        let isComplete = false;
        if (!q) { $('.next-question-btn').prop('disabled', false); return; } // End of questions
        if (!q.isMandatory) isComplete = true;
        else {
            const card = $('.question-card');
            switch (q.type) {
                case 'text': case 'grouped-select': isComplete = !!card.find(`[data-field="${q.field}"]`).val(); break;
                case 'group':
                    // Check all required fields are filled
                    const allFieldsFilled = q.fields.filter(f => {
                        // Determine if field is mandatory
                        const isMandatory = (f.label && (f.label.includes('*') || f.label.toLowerCase().includes('mandatory'))) ||
                            (f.placeholder && f.placeholder.includes('*')) ||
                            f.isMandatory;
                        return isMandatory;
                    }).every(f => {
                        const value = card.find(`[data-field="${f.id}"]`).val();
                        return value && value.trim() !== '';
                    });

                    // Check date fields are valid
                    const dateFieldsValid = q.fields.filter(f => f.type === 'date').every(f => {
                        const dateInput = card.find(`[data-field="${f.id}"]`);
                        const value = dateInput.val();

                        // If field is mandatory, it must have a value
                        if (f.isMandatory && (!value || value.trim() === '')) {
                            dateInput.addClass('invalid-date');
                            return false;
                        }

                        // If no value and not mandatory, it's valid
                        if (!value || value.trim() === '') {
                            dateInput.removeClass('invalid-date');
                            return true;
                        }

                        // Validate date format and check it's a real date
                        const dateObj = new Date(value);
                        const isValidDate = !isNaN(dateObj.getTime());

                        if (isValidDate) {
                            dateInput.removeClass('invalid-date');
                        } else {
                            dateInput.addClass('invalid-date');
                        }
                        return isValidDate;
                    });

                    // Special validation for travel_dates: return date must be after departure date and max 30 days
                    let dateRangeValid = true;
                    if (q.id === 'travel_dates') {
                        const departureDateInput = card.find('[data-field="travel_date_from"]');
                        const returnDateInput = card.find('[data-field="travel_date_to"]');
                        const departureValue = departureDateInput.val();
                        const returnValue = returnDateInput.val();

                        // Remove any existing date range error/info messages
                        card.find('.date-range-error-message').remove();
                        card.find('.date-duration-info').remove();

                        if (departureValue && returnValue) {
                            const departureDate = new Date(departureValue);
                            const returnDate = new Date(returnValue);

                            // Calculate trip duration in days
                            const timeDiff = returnDate.getTime() - departureDate.getTime();
                            const tripDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

                            if (returnDate <= departureDate) {
                                // Return date must be after departure date
                                dateRangeValid = false;
                                returnDateInput.addClass('invalid-date');

                                // Add error message below return date field
                                returnDateInput.closest('.labeled-input-group').append('<span class="date-range-error-message show">Return date must be after departure date</span>');

                                // Play warning sound
                                playWarningSound();
                            } else if (tripDays > 30) {
                                // Trip duration exceeds 30 days
                                dateRangeValid = false;
                                returnDateInput.addClass('invalid-date');

                                // Add detailed error message with guidance
                                const errorMessage = `
                                    <div class="date-range-error-message show">
                                        <p style="margin: 0 0 10px 0;"><strong>⚠️ Maximum trip duration is 30 days.</strong> Your selected duration is ${tripDays} days. Please adjust your travel dates.</p>
                                        <p style="margin: 0 0 8px 0;">💡 <strong>Tip:</strong> A 2-5 day duration is ideal for a short Schengen visa.</p>
                                        <p style="margin: 0 0 5px 0;"><strong>Why apply for a shorter stay (2-5 days)?</strong></p>
                                        <ul style="margin: 0 0 0 0; padding-left: 20px; line-height: 1.6;">
                                            <li>It aligns with your short trip purpose and appears more genuine</li>
                                            <li>It increases approval likelihood</li>
                                            <li>It preserves remaining days within the 90-day Schengen limit</li>
                                        </ul>
                                    </div>`;
                                returnDateInput.closest('.labeled-input-group').append(errorMessage);

                                // Play warning sound
                                playWarningSound();
                            } else {
                                // Valid date range - remove invalid class
                                if (!isNaN(returnDate.getTime())) {
                                    returnDateInput.removeClass('invalid-date');
                                }

                                // Show duration feedback message
                                let durationInfoHtml = '';
                                if (tripDays >= 2 && tripDays <= 5) {
                                    // Ideal duration (2-5 days) - Green positive message
                                    durationInfoHtml = `
                                        <div class="date-duration-info optimal">
                                            <div class="duration-header">
                                                <i class="fas fa-check-circle"></i>
                                                <strong>Optimal Duration</strong>
                                            </div>
                                            <p><strong>Great choice!</strong> A ${tripDays}-day trip is ideal for a short-duration Schengen visa. This aligns with your travel purpose and increases approval likelihood while preserving your remaining days within the 90-day Schengen limit.</p>
                                            <div class="trip-duration-badge">
                                                <i class="fas fa-calendar-alt"></i> Trip Duration: <strong>${tripDays} days</strong>
                                            </div>
                                        </div>`;
                                } else if (tripDays >= 6 && tripDays <= 14) {
                                    // Acceptable but could be shorter - Amber advisory message
                                    durationInfoHtml = `
                                        <div class="date-duration-info advisory">
                                            <div class="duration-header">
                                                <i class="fas fa-info-circle"></i>
                                                <strong>Duration Advisory</strong>
                                            </div>
                                            <p>Your selected trip is <strong>${tripDays} days</strong>. While acceptable, consider a shorter stay of <strong>2-5 days</strong> for better approval chances.</p>
                                            <div class="duration-benefits">
                                                <span class="benefit-title">Why apply for a shorter stay (2-5 days)?</span>
                                                <ul>
                                                    <li>It aligns with your short trip purpose and appears more genuine</li>
                                                    <li>It increases approval likelihood</li>
                                                    <li>It preserves remaining days within the 90-day Schengen limit</li>
                                                </ul>
                                            </div>
                                            <div class="trip-duration-badge">
                                                <i class="fas fa-calendar-alt"></i> Trip Duration: <strong>${tripDays} days</strong>
                                            </div>
                                        </div>`;
                                } else if (tripDays >= 15 && tripDays <= 30) {
                                    // Long duration - Stronger warning
                                    durationInfoHtml = `
                                        <div class="date-duration-info warning">
                                            <div class="duration-header">
                                                <i class="fas fa-exclamation-triangle"></i>
                                                <strong>Long Duration Notice</strong>
                                            </div>
                                            <p>Your selected trip is <strong>${tripDays} days</strong>. We strongly recommend a shorter stay of <strong>2-5 days</strong> for first-time or short-visit applicants.</p>
                                            <div class="duration-benefits">
                                                <span class="benefit-title">Why apply for a shorter stay (2-5 days)?</span>
                                                <ul>
                                                    <li>It aligns with your short trip purpose and appears more genuine</li>
                                                    <li>It increases approval likelihood</li>
                                                    <li>It preserves remaining days within the 90-day Schengen limit</li>
                                                </ul>
                                            </div>
                                            <div class="trip-duration-badge">
                                                <i class="fas fa-calendar-alt"></i> Trip Duration: <strong>${tripDays} days</strong>
                                            </div>
                                        </div>`;
                                } else if (tripDays === 1) {
                                    // Single day trip - Advisory
                                    durationInfoHtml = `
                                        <div class="date-duration-info advisory">
                                            <div class="duration-header">
                                                <i class="fas fa-info-circle"></i>
                                                <strong>Duration Advisory</strong>
                                            </div>
                                            <p>A <strong>1-day trip</strong> may appear unusual. Consider extending to <strong>2-5 days</strong> for a more credible travel plan.</p>
                                            <div class="trip-duration-badge">
                                                <i class="fas fa-calendar-alt"></i> Trip Duration: <strong>${tripDays} day</strong>
                                            </div>
                                        </div>`;
                                }

                                // Append the duration info after the return date input group
                                if (durationInfoHtml) {
                                    card.find('.labeled-input-group').last().after(durationInfoHtml);
                                }
                            }
                        }
                    }

                    // Check place name fields are valid (no leading space, double space, or . or ,)
                    const placeNameFieldsValid = q.fields.filter(f => f.validate === 'place_name').every(f => {
                        const input = card.find(`[data-field="${f.id}"]`);
                        const value = input.val();
                        if (!value) return !f.isMandatory;

                        const isValid = validatePlaceName(value);

                        // Add visual feedback
                        if (isValid) {
                            input.removeClass('invalid-place-name');
                        } else {
                            input.addClass('invalid-place-name');
                        }
                        return isValid;
                    });

                    // Check email fields are valid
                    const emailFieldsValid = q.fields.filter(f => f.type === 'email').every(f => {
                        const emailInput = card.find(`[data-field="${f.id}"]`);
                        const value = emailInput.val();
                        if (!value) return !f.isMandatory;

                        // Use comprehensive email validation
                        const validation = validateEmail(value);
                        const isValid = validation.isValid;

                        // Add visual feedback
                        if (isValid) {
                            emailInput.removeClass('invalid-email');
                            // Remove error message if exists
                            emailInput.siblings('.email-error-message').removeClass('show');
                        } else {
                            emailInput.addClass('invalid-email');
                            // Add error message if not already present
                            if (emailInput.siblings('.email-error-message').length === 0) {
                                emailInput.after('<span class="email-error-message"></span>');
                            }
                            emailInput.siblings('.email-error-message').text(validation.message).addClass('show');
                        }
                        return isValid;
                    });

                    isComplete = allFieldsFilled && emailFieldsValid && placeNameFieldsValid && dateFieldsValid && dateRangeValid;
                    break;
                case 'radio': isComplete = card.find(`input[name="${q.id}"]:checked`).length > 0; break;
                case 'radio-with-upload':
                    // Check if radio is selected
                    const radioSelected = card.find(`input[name="${q.id}"]:checked`).length > 0;
                    const radioValue = card.find(`input[name="${q.id}"]:checked`).val();

                    // Special handling for bookings question - "No" is not allowed except for Germany and Switzerland
                    if (q.id === 'bookings' && radioValue === 'No') {
                        const travelCountry = (recordData.personal?.travel_country || '').toLowerCase();
                        const isGermanyOrSwitzerland = travelCountry === 'germany' || travelCountry === 'switzerland';
                        isComplete = isGermanyOrSwitzerland ? true : false;
                    }
                    // If "Yes" is selected, also check if file is uploaded
                    else if (radioValue === 'Yes') {
                        isComplete = radioSelected && (recordData.questions[q.uploadField] && recordData.questions[q.uploadField].length > 0);
                    } else {
                        isComplete = radioSelected;
                    }
                    break;
                case 'file': isComplete = (recordData.questions[q.field] && recordData.questions[q.field].length > 0); break; // Must have file in record
                case 'sponsor-details':
                    const selection = card.find('input[name="travel_covered_by"]:checked').val();
                    if (selection === 'Myself') isComplete = true;
                    else if (selection) isComplete = Array.from($('#sponsor-details-container').find('input, select')).filter(i => ($(i).attr('placeholder') || $(i).find('option:first').text() || '').includes('*')).every(i => $(i).val());
                    break;
                case 'confirm-dates': isComplete = $('#dates-confirmed').is(':checked'); break;
                case 'accommodation':
                    // Check all mandatory fields (those with * in label or placeholder)
                    const accommodationInputs = card.find('.accommodation-subsection input, .accommodation-subsection select');
                    isComplete = accommodationInputs.filter(function () {
                        const input = $(this);
                        const placeholder = input.attr('placeholder') || '';
                        const label = input.closest('.labeled-input-group').find('label').text() || '';
                        const isRequired = placeholder.includes('*') || label.includes('*');
                        return isRequired;
                    }).toArray().every(input => $(input).val() && $(input).val().trim() !== '');
                    break;
                case 'evisa-details':
                    // Must have the mandatory file uploaded
                    const evisaFileField = q.fields.find(f => f.id === 'evisa_document_path');
                    isComplete = recordData.questions[evisaFileField.id] &&
                        recordData.questions[evisaFileField.id].length > 0;
                    break;
                case 'share-code-details':
                    // Must have the mandatory file uploaded
                    const shareCodeFileField = q.fields.find(f => f.id === 'share_code_document_path');
                    isComplete = recordData.questions[shareCodeFileField.id] &&
                        recordData.questions[shareCodeFileField.id].length > 0;
                    break;
                default: isComplete = true; // Non-mandatory questions
            }
        }
        $('.next-question-btn').prop('disabled', !isComplete);
    }

    const renderDestinationSelect2 = (val, container = '.question-card') => {
        // FIX: Ensure container is a string selector
        const selector = typeof container === 'string' ? container : '.question-card';
        const sel = $(`${selector} [data-field="primary_destination"]`);

        // Sort destinations to put user's travel country first
        const userCountry = recordData.personal.travel_country || '';
        let priorityGroup = [];
        let otherGroups = [];

        if (userCountry) {
            destinations.forEach(group => {
                // Check if the country name (e.g., "🇬🇷 Greece") includes the DB value (e.g., "Greece")
                if (group.country.includes(userCountry)) {
                    priorityGroup.push(group);
                } else {
                    otherGroups.push(group);
                }
            });
        } else {
            otherGroups = destinations;
        }

        const sortedDestinations = [...priorityGroup, ...otherGroups];

        // Use parent element for dropdown to keep it positioned correctly
        sel.select2({
            data: sortedDestinations.map(g => ({ text: g.country, children: g.cities.map(c => ({ id: c, text: c })) })),
            placeholder: 'Search and select a city',
            width: '100%',
            allowClear: true,
            dropdownAutoWidth: false,
            dropdownParent: sel.parent()
        }).val(val).trigger('change');

        // Prevent scroll jump on mobile when dropdown opens
        sel.on('select2:open', function () {
            const isMobile = $(window).width() <= 768;
            if (isMobile) {
                // Save current scroll position
                const scrollTop = $(window).scrollTop();

                // Delay to let Select2 finish opening
                setTimeout(function () {
                    // Restore scroll position if it changed
                    $(window).scrollTop(scrollTop);

                    // Focus search without scrolling
                    const searchField = $('.select2-search__field');
                    if (searchField.length) {
                        searchField[0].focus({ preventScroll: true });
                    }
                }, 10);
            }
        });
    };

    $(document).on('click', '.next-question-btn', function () {
        const q = questions[currentQuestionIndex];

        // Check if q is defined before accessing its properties
        if (!q) {
            console.warn("Attempted to navigate past last question.");
            // Optional: Redirect to summary or end flow gracefully here if necessary
            return; // Stop execution
        }

        const card = $(this).closest('.question-card');
        let updates = {};
        let personalUpdates = {};

        switch (q.type) {
            case 'text': case 'grouped-select': case 'radio': updates[q.field] = card.find(`[data-field="${q.field}"], input[name="${q.id}"]:checked`).val(); break;
            case 'radio-with-upload':
                // Save the radio selection
                updates[q.field] = card.find(`input[name="${q.id}"]:checked`).val();
                // If "Yes" was selected, upload files will be handled by the file upload handler
                // Files are already in recordData.questions[q.uploadField] from the file upload
                break;
            case 'group':
                const target = q.table === 'personal' ? personalUpdates : updates;
                q.fields.forEach(f => {
                    let val = card.find(`[data-field="${f.id}"]`).val();
                    target[f.id] = val;
                });
                break;
            case 'sponsor-details':
                updates['travel_covered_by'] = card.find('input[name="travel_covered_by"]:checked').val();
                $('#sponsor-details-container').find('input, select').each(function () { updates[$(this).data('field')] = $(this).val(); });
                break;
            case 'accommodation':
                const sub = card.find('.accommodation-subsection');
                updates['stay_type'] = sub.data('stay-type');
                sub.find('input').each(function () { updates[$(this).data('field')] = $(this).val(); });
                break;
            case 'evisa-details':
                q.fields.forEach(f => {
                    if (f.type === 'file') return; // Handled by file upload logic
                    let val;
                    if (f.id === 'evisa_no_date_settled') {
                        val = card.find(`[data-field="${f.id}"]`).is(':checked') ? 'Yes' : 'No';
                    } else {
                        val = card.find(`[data-field="${f.id}"]`).val();
                    }
                    updates[f.id] = val;
                });
                break;
            case 'share-code-details':
                q.fields.forEach(f => {
                    if (f.type === 'file') return; // Handled by file upload logic
                    let val = card.find(`[data-field="${f.id}"]`).val();
                    updates[f.id] = val;
                });
                break;
        }
        if (Object.keys(personalUpdates).length > 0) savePersonalData(personalUpdates);

        // Add last_question_index to the updates
        updates['last_question_index'] = currentQuestionIndex + 1;
        if (Object.keys(updates).length > 0) saveQuestionData(updates);

        currentQuestionIndex++;
        renderQuestion();

        // Auto-scroll to question section on mobile
        setTimeout(function () {
            scrollToQuestion();
        }, 100);
    });

    $(document).on('click', '.back-question-btn', () => {
        if (currentQuestionIndex === 0) {
            navigateTo('#personal-info-view');
            return;
        }
        currentQuestionIndex--;
        while (currentQuestionIndex > 0 && questions[currentQuestionIndex].condition && !questions[currentQuestionIndex].condition(recordData.questions || {}, recordData.personal || {})) {
            currentQuestionIndex--;
        }
        // Save progress on going back
        saveQuestionData({ last_question_index: currentQuestionIndex });
        renderQuestion();

        // Auto-scroll to question section on mobile
        setTimeout(function () {
            scrollToQuestion();
        }, 100);
    });

    $(document).on('change', '.file-input', function () {
        if (isFormLocked) return;
        const input = $(this);
        const wrapper = input.closest('.file-upload-wrapper, .summary-upload-area');

        let db_field, qId, fieldDef;

        if (wrapper.hasClass('summary-upload-area')) { // SUMMARY PAGE
            const infoItem = wrapper.closest('.info-item');
            db_field = infoItem.data('field');
            qId = infoItem.data('question-id');
        } else { // QUESTION FLOW PAGE
            db_field = wrapper.data('field');
            qId = input.closest('.question-card').data('question-id');
        }

        const q = questions.find(q => q.id === qId);
        if (!q || !this.files.length || !db_field) {
            console.error("Could not find question or db_field for file upload.");
            return;
        }

        // FIX: Support radio-with-upload type
        let inputNameBase, inputNameWithBrackets;

        if (q.type === 'radio-with-upload' && db_field === q.uploadField) {
            // For radio-with-upload, use uploadInputName from question
            inputNameWithBrackets = q.uploadInputName;
            inputNameBase = inputNameWithBrackets.replace('[]', '');
            fieldDef = { inputName: inputNameWithBrackets }; // Create temporary fieldDef
        } else if (q.field === db_field) {
            // Simple file question
            fieldDef = q;
            inputNameBase = fieldDef.inputName.replace('[]', '');
            inputNameWithBrackets = fieldDef.inputName;
        } else if (q.fields) {
            // Complex question with file field
            fieldDef = q.fields.find(f => f.id === db_field);
            if (!fieldDef || !fieldDef.inputName) {
                console.error("Could not find field definition or inputName for " + db_field);
                return;
            }
            inputNameBase = fieldDef.inputName.replace('[]', '');
            inputNameWithBrackets = fieldDef.inputName;
        } else {
            console.error("Could not determine input name for " + db_field);
            return;
        }

        const statusEl = wrapper.find('.file-status');
        statusEl.text('Uploading...').removeClass('error success');
        const formData = new FormData();
        formData.append('token', token);
        formData.append('input_name', inputNameBase);
        formData.append('db_field', db_field);

        for (let i = 0; i < this.files.length; i++) {
            formData.append('files', this.files[i]); // SPRING BOOT MIGRATION: Changed from inputNameWithBrackets to 'files'
        }

        // SPRING BOOT MIGRATION: Changed from api/public_api.php?action=upload_files
        $.ajax({
            url: `api/upload_files`, type: 'POST', data: formData, contentType: false, processData: false, dataType: 'json',
            success: res => {
                if (res.status === 'success') {
                    statusEl.text(`Upload successful! ${res.data.errors ? res.data.errors.join(', ') : ''}`).addClass('success');
                    if (res.data.errors && res.data.errors.length > 0) statusEl.removeClass('success').addClass('error');

                    recordData.questions[db_field] = res.data.filenames;
                    updateGlobalProgressBarAndSave();

                    const fileList = createFileList(res.data.filenames || [], db_field); // FIX 3: Renamed from createFileLis

                    if (currentView === '#summary-view') {
                        wrapper.closest('.info-item').find('.file-list').html(fileList || '<i>No files uploaded.</i>');
                    } else {
                        wrapper.find('.image-preview').show().find('.file-list').html(fileList);
                        checkQuestionCompletion();
                    }
                } else {
                    statusEl.text(`Error: ${res.message}`).addClass('error');
                }
            },
            error: () => statusEl.text('An unknown server error occurred.').addClass('error')
        });
    });

    // NEW: Delete file handler
    $(document).on('click', '.btn-delete-file', function (e) {
        e.preventDefault();

        // FIX: Check if form is locked and show message
        if (isFormLocked) {
            alert('The form is locked and cannot be edited. Files cannot be deleted.');
            return;
        }

        const btn = $(this);
        const filename = btn.data('filename');
        const db_field = btn.data('field');

        $('#delete-modal-filename').text(filename);
        $('#delete-modal-confirm').data('filename', filename).data('db_field', db_field).data('btn', btn);
        $('#delete-modal-backdrop').fadeIn(200);
    });

    $('#delete-modal-cancel').on('click', () => {
        $('#delete-modal-backdrop').fadeOut(200);
    });

    $('#delete-modal-confirm').on('click', function () {
        const btn = $(this);
        const filename = btn.data('filename');
        const db_field = btn.data('db_field');
        const deleteBtn = btn.data('btn');
        const li = deleteBtn.closest('li');

        btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i>');

        // SPRING BOOT MIGRATION: Changed from api/public_api.php?action=delete_file
        $.ajax({
            url: 'api/delete_file',
            type: 'POST',
            contentType: 'application/json',
            dataType: 'json',
            data: JSON.stringify({ token, db_field, filename }),
            success: res => {
                if (res.status === 'success') {
                    // FIX: Handle the remaining files array correctly
                    if (res.data && res.data.remaining_files) {
                        recordData.questions[db_field] = res.data.remaining_files;
                    } else {
                        // Fallback: manually remove the deleted file from local array
                        const currentFiles = recordData.questions[db_field] || [];
                        if (Array.isArray(currentFiles)) {
                            recordData.questions[db_field] = currentFiles.filter(f => f !== filename);
                        }
                    }
                    li.fadeOut(300, function () {
                        const list = $(this).closest('ul');
                        $(this).remove();
                        if (list.children().length === 0) {
                            list.closest('.image-preview').hide();
                            if (currentView === '#summary-view') list.html('<i>No files uploaded.</i>');
                        }
                    });
                    updateGlobalProgressBarAndSave();
                    if (currentView !== '#summary-view') checkQuestionCompletion();
                    $('#delete-modal-backdrop').fadeOut(200);
                } else {
                    alert('Error deleting file: ' + res.message);
                }
            } // Close success function
        }).fail(() => {
            alert('Server error while deleting file.');
        }).always(() => {
            btn.prop('disabled', false).html('Delete File');
        });
    });

    function savePersonalData(data, callback) {
        if (isFormLocked) return;
        if (!recordData.personal) recordData.personal = {};
        Object.assign(recordData.personal, data);
        updateGlobalProgressBarAndSave();
        for (const [field, value] of Object.entries(data)) {
            // SPRING BOOT MIGRATION: Changed from api/public_api.php?action=update_personal
            $.ajax({
                url: 'api/update_personal',
                type: 'POST',
                contentType: 'application/json',
                dataType: 'json',
                data: JSON.stringify({ token, field, value }),
                success: callback || $.noop,
                error: err => {
                    const res = err.responseJSON;
                    if (res && res.message) alert('Error: ' + res.message);
                }
            });
        }
    }

    function saveQuestionData(data, callback) {
        if (isFormLocked) {
            // Allow saving last_question_index even if locked
            if (Object.keys(data).length === 1 && data.last_question_index !== undefined) {
                // SPRING BOOT MIGRATION
                $.ajax({
                    url: 'api/update_questions',
                    type: 'POST',
                    contentType: 'application/json',
                    dataType: 'json',
                    data: JSON.stringify({ token, data: data })
                });
            }
            return;
        }

        if (!recordData.questions) recordData.questions = {};
        Object.assign(recordData.questions, data);

        // --- MAP FIELDS FOR BACKEND ---
        // The backend expects 'company_*' fields, but the frontend uses 'inviting_company_*'
        // for business/family visit logic. We need to map them before sending.
        const payloadData = { ...data }; // Create a copy to modify

        const companyMappings = {
            'inviting_company_name': 'company_name',
            'inviting_company_address_1': 'company_address_1',
            'inviting_company_address_2': 'company_address_2',
            'inviting_company_city': 'company_city',
            'inviting_company_state': 'company_state',
            'inviting_company_zip': 'company_zip',
            'inviting_company_phone': 'company_phone',
            'inviting_company_email': 'company_email'
        };

        Object.keys(companyMappings).forEach(frontendField => {
            if (payloadData.hasOwnProperty(frontendField)) {
                const backendField = companyMappings[frontendField];
                payloadData[backendField] = payloadData[frontendField];
            }
        });
        // -----------------------------

        // Only update progress bar if it's not just saving the index
        if (data.last_question_index === undefined) {
            updateGlobalProgressBarAndSave();
        }

        const requestPayload = { token, data: payloadData };
        console.log("Saving Question Data Payload:", requestPayload);

        // SPRING BOOT MIGRATION: Changed from api/public_api.php?action=update_questions
        $.ajax({
            url: 'api/update_questions',
            type: 'POST',
            contentType: 'application/json',
            dataType: 'json',
            data: JSON.stringify(requestPayload),
            success: callback || $.noop,
            error: err => {
                const res = err.responseJSON;
                if (res && res.message) alert('Error: ' + res.message);
            }
        });
    }

    function updateGlobalProgressBarAndSave() {
        const percentage = updateGlobalProgressBar();
        saveProgress(percentage);
    }

    function saveProgress(percentage) {
        if (isFormLocked) return;
        if (percentage >= 35) {
            // SPRING BOOT MIGRATION: Changed from api/public_api.php?action=update_progress
            $.ajax({
                url: 'api/update_progress',
                type: 'POST',
                contentType: 'application/json',
                dataType: 'json',
                data: JSON.stringify({ token: token, percentage: percentage }),
                success: function (res) {
                    if (res.status !== 'success') {
                        console.error("Failed to save progress:", res.message);
                    }
                },
                error: function () {
                    console.error("Server error while saving progress.");
                }
            });
        }
    }

    // --- Summary View Logic (NEW) ---
    function renderSummaryView() {
        if (isFormLocked) {
            $('.form-container').addClass('locked');
            $('#summary-final-message').html('<i class="fas fa-lock"></i> Your application has been submitted and is now locked for editing.').show();
        } else {
            $('#summary-final-message').hide();
        }

        // 1. Locked Information
        const lockedGrid = $('#summary-locked-grid');
        lockedGrid.empty();
        const staticFields = [{ id: 'first_name', label: 'First Name' }, { id: 'last_name', label: 'Last Name' }, { id: 'dob', label: 'Date of Birth' }, { id: 'nationality', label: 'Nationality' }, { id: 'passport_no', label: 'Passport No.' }, { id: 'passport_issue', label: 'Passport Issue' }, { id: 'passport_expire', label: 'Passport Expire' }];
        staticFields.forEach(f => lockedGrid.append(createSummaryInfoItem(f.id, f.label, recordData.personal[f.id], {}, {}, true)));

        // 2. Personal Details
        const personalGrid = $('#summary-personal-grid');
        personalGrid.empty();
        editablePersonalFields.forEach(id => {
            let label = id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            if (id === 'zip_code') label = 'Postal Code';
            const isMandatory = mandatoryPersonalFields.includes(id);
            personalGrid.append(createSummaryInfoItem(id, label, recordData.personal[id], { table: 'personal' }, { type: 'text' }, false, isMandatory));
        });

        // 3. Questions Grid
        const qData = recordData.questions || {};
        const pData = recordData.personal || {};
        const questionsGrid = $('#summary-questions-grid');
        questionsGrid.empty();

        const allRelevantFields = new Map();

        questions.forEach(q => {
            // Special handling for accommodation
            if (q.id === 'accommodation_details') {
                if (q.condition && q.condition(qData, pData)) {
                    const visaType = (pData.visa_type || '').toLowerCase();
                    let accommodationFields = [];

                    if (visaType.includes('tourist')) {
                        accommodationFields = [
                            { id: 'hotel_name', label: 'Hotel Name', type: 'text' }, { id: 'hotel_address_1', label: 'Address Line 1', type: 'text' },
                            { id: 'hotel_address_2', label: 'Address Line 2', type: 'text' }, { id: 'hotel_city', label: 'City', type: 'text' },
                            { id: 'hotel_state', label: 'State/Province', type: 'text' }, { id: 'hotel_zip', label: 'Postal Code', type: 'text' },
                            { id: 'hotel_contact_number', label: 'Hotel Contact', type: 'text' }, { id: 'hotel_booking_reference', label: 'Booking Reference', type: 'text' }
                        ];
                    } else if (visaType.includes('family') || visaType.includes('friend')) {
                        accommodationFields = [
                            { id: 'inviting_person_first_name', label: 'Inviting Person First Name', type: 'text' }, { id: 'inviting_person_surname', label: 'Inviting Person Surname', type: 'text' },
                            { id: 'inviting_person_email', label: 'Inviting Person Email', type: 'text' },
                            { id: 'inviting_person_phone_code', label: 'Inviting Person Phone Code', type: 'text', col_class: 'half' }, { id: 'inviting_person_phone', label: 'Inviting Person Phone', type: 'text', col_class: 'half' },
                            { id: 'inviting_person_relationship', label: 'Relationship', type: 'text' },
                            { id: 'inviting_person_address_1', label: 'Address Line 1', type: 'text' }, { id: 'inviting_person_address_2', label: 'Address Line 2', type: 'text' },
                            { id: 'inviting_person_city', label: 'City', type: 'text' }, { id: 'inviting_person_state', label: 'State/Province', type: 'text' }, { id: 'inviting_person_zip', label: 'Postal Code', type: 'text' }
                        ];
                    } else if (visaType.toLowerCase().includes('business')) {
                        accommodationFields = [
                            { id: 'inviting_company_name', label: 'Company Name', type: 'text' }, { id: 'inviting_company_contact_person', label: 'Contact Person', type: 'text' },
                            { id: 'inviting_company_address_1', label: 'Address Line 1', type: 'text' }, { id: 'inviting_company_address_2', label: 'Address Line 2', type: 'text' },
                            { id: 'inviting_company_city', label: 'City', type: 'text' }, { id: 'inviting_company_state', label: 'State/Province', type: 'text' }, { id: 'inviting_company_zip', label: 'Postal Code', type: 'text' }, { id: 'inviting_company_phone', label: 'Company Phone', type: 'text' }
                        ];
                    }

                    accommodationFields.forEach(f => {
                        allRelevantFields.set(f.id, { label: f.label, value: qData[f.id], question: q, fieldDef: f, isMandatory: (f.label.includes('*')) });
                    });
                }
                return;
            }

            // Special handling for sponsor
            if (q.id === 'travel_sponsor') {
                allRelevantFields.set(q.field, { label: q.text, value: qData[q.field], question: q, fieldDef: q, isMandatory: q.isMandatory });
                let sponsorFields = [];
                if (qData.travel_covered_by === 'Family Member / Family Member in the EU') {
                    sponsorFields = [
                        { id: 'sponsor_relation', label: 'Relation', type: 'select', options: ['Spouse / Civil Partner', 'Parent(s)', 'Sibling'] }, { id: 'sponsor_full_name', label: 'Full Name', type: 'text' },
                        { id: 'sponsor_address_1', label: 'Address Line 1', type: 'text' }, { id: 'sponsor_address_2', label: 'Address Line 2', type: 'text' },
                        { id: 'sponsor_city', label: 'City', type: 'text' }, { id: 'sponsor_state', label: 'State', type: 'text' }, { id: 'sponsor_zip', label: 'Postal Code', type: 'text' },
                        { id: 'sponsor_email', label: 'Email', type: 'text' }, { id: 'sponsor_phone', label: 'Phone', type: 'text' }
                    ];
                } else if (qData.travel_covered_by === 'Host / Company / Organisation') {
                    sponsorFields = [
                        { id: 'host_name', label: 'Host Name', type: 'text' }, { id: 'host_phone', label: 'Host Phone', type: 'text' }, { id: 'host_company_name', label: 'Company Name', type: 'text' },
                        { id: 'host_address_1', label: 'Address Line 1', type: 'text' }, { id: 'host_address_2', label: 'Address Line 2', type: 'text' },
                        { id: 'host_city', label: 'City', type: 'text' }, { id: 'host_state', label: 'State', type: 'text' }, { id: 'host_zip', label: 'Postal Code', type: 'text' },
                        { id: 'host_email', label: 'Email', type: 'text' }, { id: 'host_company_phone', label: 'Company Phone', type: 'text' }
                    ];
                }
                sponsorFields.forEach(f => {
                    allRelevantFields.set(f.id, { label: f.label, value: qData[f.id], question: q, fieldDef: f, isMandatory: (f.label.includes('*')) });
                });
                return;
            }

            if (!q.condition || q.condition(qData, pData)) {
                if (q.fields) {
                    q.fields.forEach(f => {
                        const value = (q.table === 'personal' ? pData : qData)[f.id];
                        let label = f.placeholder ? f.placeholder.replace(' *', '') : (f.label || f.id);
                        if (f.id.endsWith('_zip')) label = 'Postal Code';
                        allRelevantFields.set(f.id, { label, value, question: q, fieldDef: f, isMandatory: (f.placeholder || f.label || '').includes('*') });
                    });
                } else if (q.field) {
                    allRelevantFields.set(q.field, { label: q.text, value: qData[q.field], question: q, fieldDef: q, isMandatory: q.isMandatory });

                    // FIX: Handle radio-with-upload to show attached files in summary
                    if (q.type === 'radio-with-upload' && q.uploadField) {
                        // Strictly check if the radio answer is 'Yes' to decide if files should be shown
                        // This applies to Bookings, Fingerprints, etc.
                        if (qData[q.field] === 'Yes') {
                            allRelevantFields.set(q.uploadField, {
                                label: q.uploadLabel || 'Uploaded Documents',
                                value: qData[q.uploadField],
                                question: q,
                                // Create a synthetic field definition for the file part
                                fieldDef: {
                                    type: 'file',
                                    id: q.uploadField,
                                    inputName: q.uploadInputName || q.uploadField,
                                    accept: q.accept
                                },
                                isMandatory: false
                            });
                        }
                    }
                }
            }
        });

        const categoryOrder = ['Personal Profile', 'Financial & Sponsorship', 'Employment / Occupation', 'Travel Plans', 'Accommodation', 'Immigration Status', 'Travel History', 'Bookings'];

        // Font Awesome icons for categories
        const categoryIcons = {
            'Personal Profile': 'fa-user',
            'Financial & Sponsorship': 'fa-credit-card',
            'Employment / Occupation': 'fa-briefcase',
            'Travel Plans': 'fa-plane-departure',
            'Accommodation': 'fa-hotel',
            'Immigration Status': 'fa-passport',
            'Travel History': 'fa-history',
            'Bookings': 'fa-ticket-alt'
        };

        categoryOrder.forEach(category => {
            let fieldsInCategory = '';
            allRelevantFields.forEach((field, id) => {
                if (field.question.category === category) {
                    fieldsInCategory += createSummaryInfoItem(id, field.label, field.value, field.question, field.fieldDef, false, field.isMandatory);
                }
            });

            if (fieldsInCategory) {
                const iconClass = categoryIcons[category] || 'fa-info-circle';
                let categoryHtml = `
                <div class="section" id="section-${category.toLowerCase().replace(/ /g, '-').replace(/\//g, '')}">
                    <div class="section-header">
                        <h3 class="section-title"><i class="fas ${iconClass}"></i> ${category}</h3>
                        <div class="section-edit-buttons">
                            <button class="btn-secondary cancel-btn" style="display: none;"><i class="fas fa-times"></i> Cancel</button>
                            <button class="btn-primary edit-btn"><i class="fas fa-edit"></i> Edit</button>
                        </div>
                    </div>
                    <div class="info-grid">${fieldsInCategory}</div>
                </div>`;
                questionsGrid.append(categoryHtml);
            }
        });

        // Post-render setup for select2
        renderDestinationSelect2(qData.primary_destination, '#summary-questions-grid');
        $('#summary-questions-grid .select2-input').each(function () {
            const q = questions.find(q => q.field === $(this).data('field'));
            if (q && q.options) {
                $(this).select2({
                    data: q.options.map(o => ({ id: o, text: o })),
                    width: '100%',
                    allowClear: true,
                    dropdownAutoWidth: true,
                    dropdownParent: $(this).parent()
                });
                $(this).val(qData[q.field]).trigger('change');
            }
        });

        // Add submission buttons
        const percentage = updateGlobalProgressBar();
        const actionsContainer = $('#summary-actions-container');
        actionsContainer.empty();

        // Display all validation warnings before submission
        const warnings = collectAllWarnings();
        if (warnings.length > 0) {
            let warningsHtml = '<div class="summary-warnings-section"><h3 class="warnings-title"><i class="fas fa-exclamation-triangle"></i> Important Warnings</h3>';
            warnings.forEach(warning => {
                warningsHtml += `<div class="date-warning warning">${warning}</div>`;
            });
            warningsHtml += '</div>';
            actionsContainer.append(warningsHtml);
        }

        if (percentage >= 100 && !isFormLocked) {
            actionsContainer.append(`
                <div id="summary-actions" class="navigation-buttons">
                    <span></span>
                    <button id="proceed-to-submit-btn" class="btn-primary">Proceed to Final Submission <i class="fas fa-arrow-right"></i></button>
                </div>
             `);
        }
    }

    /**
     * Collect all validation warnings for display on review page
     * @returns {Array} Array of warning messages
     */

    // FIX: Ensure file uploads are displayed in summary - The code to do this was missing but the files were being passed to the existing item creator. I will rely on the existing item creator and focus on the rest of the file.
    function ensureFileFieldsInSummary() {
        const fileFieldsToShow = [
            { id: 'evisa_document_path', label: 'eVisa Document', category: 'Immigration Status' },
            { id: 'share_code_document_path', label: 'Share Code Document', category: 'Immigration Status' },
            { id: 'schengen_visa_image', label: 'Previous Visa Image', category: 'Travel History' },
            { id: 'booking_documents_path', label: 'Booking Documents', category: 'Bookings' }
        ];

        fileFieldsToShow.forEach(field => {
            const files = getUploadedFiles(field.id);
            if (files.length > 0) {
                // The main renderSummaryView logic already iterates through questions and fields
                // to build allRelevantFields, which includes file fields if they were filled.
                // This function is redundant if the core logic is correct, but can be used
                // as a quick post-check/fix to ensure visibility if a field definition
                // was missed. As the question flow includes these, the main summary should too.
                // We'll trust the main logic and skip manual insertion here to prevent duplication.
                // If it was needed, the logic would need to find the correct Q/F definition.
            }
        });
    }


    function collectAllWarnings() {
        const warnings = [];
        const qData = recordData.questions || {};

        // Check Departure Date (max 6 months)
        if (qData.travel_date_from) {
            const dateValidation = validateDepartureDate(qData.travel_date_from);
            if (dateValidation.isTooFarOut) {
                warnings.push('<strong>⚠️ Travel Date Too Far in Future</strong><br><br>Please choose a travel date within 6 months duration.<br><br>Your selected departure date is more than 6 months from today. Visa applications are typically processed for travel within 6 months.');
            } else if (!dateValidation.isValid && dateValidation.daysUntilDeparture >= 0) {
                warnings.push(`<strong>⚠️ Important Travel Date Notice</strong><br><br>The visa processing time is approximately 20–30 days after the appointment. Please change your travel date accordingly.<br><br><strong>Current situation:</strong> Your departure is only ${dateValidation.daysUntilDeparture} day${dateValidation.daysUntilDeparture !== 1 ? 's' : ''} away.<br><br><strong>Recommendation:</strong> It is recommended to allow at least 35+ days between your appointment and travel date. This improves your chances of receiving a visa with a longer validity period (such as a 3-month visa).`);
            } else if (dateValidation.daysUntilDeparture < 0) {
                warnings.push('<strong>⚠️ Invalid Travel Date</strong><br><br>Your departure date is in the past. Please select a future date.');
            }
        }

        // Check eVisa Expiry (must be valid 3 months after return)
        if (qData.evisa_expiry_date && qData.travel_date_to) {
            const evisaValidation = validateEvisaExpiry(qData.evisa_expiry_date, qData.travel_date_to);
            if (!evisaValidation.isValid) {
                warnings.push(evisaValidation.message);
            }
        }

        // Check Share Code Expiry (must be valid 2 months from today)
        if (qData.share_code_expiry_date) {
            const shareCodeValidation = validateShareCodeExpiry(qData.share_code_expiry_date);
            if (!shareCodeValidation.isValid) {
                warnings.push(shareCodeValidation.message);
            }
        }

        return warnings;
    }

    // Re-usable function to create an info-item
    function createSummaryInfoItem(id, label, value, questionDef, fieldDef, isReadOnly = false, isMandatory = false) {
        let displayValue = '';
        let itemClass = 'info-item';
        if (isReadOnly) itemClass += ' read-only';
        if (fieldDef.col_class === 'half') itemClass += ' col-span-half'; // (CSS for this would be needed)

        if (fieldDef.type === 'file' || id.includes('_path') || id.includes('_image')) { // Added logic for file field IDs
            itemClass += ' full-width';
            // FIX: Properly parse and display files on summary page
            let files = getUploadedFiles(id);
            fieldDef.type = 'file'; // Ensure type is correct for createEditInput

            files = Array.isArray(files) ? files : [];
            displayValue = `<ul class="file-list">${createFileList(files, id) || '<i>No files uploaded.</i>'}</ul>`;
        } else if (fieldDef.type === 'checkbox-text') {
            displayValue = value === 'Yes' ? 'Yes' : '<i>Not set</i>';
        } else if (fieldDef.type === 'date') {
            displayValue = formatDateForDisplay(value); // Use date formatter
        } else {
            displayValue = value || '';
        }

        // NEW: Hide settled status if dates are present
        if (id === 'evisa_no_date_settled') {
            const issueDate = recordData.questions['evisa_issue_date'];
            const expiryDate = recordData.questions['evisa_expiry_date'];
            if (issueDate && expiryDate) {
                itemClass += ' hidden-field'; // CSS will hide this
            }
        }

        return `
        <div class="${itemClass}" data-field="${id}" data-question-id="${questionDef.id || ''}" data-table="${questionDef.table || 'questions'}">
            <label>${label} ${isMandatory ? '<span class="mandatory-marker">*</span>' : ''}</label>
            <div class="display-value ${!displayValue.includes('files uploaded') && (!value || displayValue.includes('Not set')) ? 'not-set' : ''}">${displayValue || '<i>Not set</i>'}</div>
            ${!isReadOnly ? `<div class="edit-input-wrapper" style="display:none;">${createEditInput(id, value, fieldDef)}</div>` : ''}
        </div>`;
    }

    // Helper to create edit inputs for summary page
    function createEditInput(id, value, fieldDef) {
        if (fieldDef.type === 'file' || id.includes('_path') || id.includes('_image')) {
            const q = questions.find(q => q.field === id || (q.fields && q.fields.some(f => f.id === id)));
            if (!q) return 'Error: Could not find question definition.';

            const fileFieldDef = q.field === id ? q : q.fields.find(f => f.id === id);
            if (!fileFieldDef) return 'Error: Could not find field definition.';

            const inputName = fileFieldDef.inputName;
            const accept = fileFieldDef.accept || '*';

            return `
            <div class="summary-upload-area">
               <input type="file" id="summary-upload-${id}" class="file-input" name="${inputName}" ${accept ? `accept="${accept}"` : ''} multiple>
               <label for="summary-upload-${id}" class="file-label btn-secondary btn-sm"><i class="fas fa-upload"></i> Upload More</label>
               <div class="file-status"></div>
            </div>`;
        } else if (fieldDef.type === 'select' || (fieldDef.options && fieldDef.options.length > 0)) {
            const options = fieldDef.options || [];
            return `<select class="edit-input-field select2-input" data-field="${id}">${options.map(o => `<option value="${o}" ${value === o ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
        } else if (id === 'primary_destination') {
            return `<select class="edit-input-field" data-field="primary_destination"></select>`;
        } else if (fieldDef.type === 'date') {
            return `<input type="date" class="edit-input-field" value="${value || ''}">`;
        } else if (fieldDef.type === 'checkbox-text') {
            return `<div class="confirmation-section" style="padding:0; border:0; background:0;">
                        <label class="confirmation-label" style="margin-bottom:0;">
                            <input type="checkbox" class="edit-input-field" ${value === 'Yes' ? 'checked' : ''}>
                            ${fieldDef.label}
                        </label>
                    </div>`;
        }
        return `<input type="text" class="edit-input-field" value="${value || ''}">`;
    }



    // NEW: Summary page edit/save/cancel logic
    $(document).on('click', '#summary-view .edit-btn', function () {
        if (isFormLocked) return;
        const section = $(this).closest('.section');
        section.find('.display-value').hide();
        section.find('.edit-input-wrapper').show();
        section.find('.cancel-btn').show();
        $(this).html('<i class="fas fa-save"></i> Save').addClass('save-btn');

        // Initialize select2s
        section.find('.select2-input').each(function () {
            const fieldId = $(this).data('field');
            const q = questions.find(q => q.field === fieldId);
            if (q && q.options) {
                $(this).select2({
                    data: q.options.map(o => ({ id: o, text: o })),
                    width: '100%',
                    allowClear: true,
                    dropdownAutoWidth: true,
                    dropdownParent: $(this).parent()
                });
            }
        });
        renderDestinationSelect2(recordData.questions.primary_destination, section);

        // Special: eVisa date logic
        section.find('.info-item[data-field="evisa_issue_date"] input, .info-item[data-field="evisa_expiry_date"] input').on('change', function () {
            const issueDate = section.find('.info-item[data-field="evisa_issue_date"] input').val();
            const expiryDate = section.find('.info-item[data-field="evisa_expiry_date"] input').val();
            const settledWrapper = section.find('.info-item[data-field="evisa_no_date_settled"]');

            if (issueDate && expiryDate) {
                settledWrapper.slideUp();
                settledWrapper.find('input').prop('checked', false);
            } else {
                settledWrapper.slideDown();
            }
        }).trigger('change');
    });

    $(document).on('click', '#summary-view .cancel-btn', function () {
        const section = $(this).closest('.section');
        section.find('.display-value').show();
        section.find('.edit-input-wrapper').hide();
        section.find('.cancel-btn').hide();
        section.find('.edit-btn').html('<i class="fas fa-edit"></i> Edit').removeClass('save-btn');

        // Reset inputs to original values (need to re-render)
        const grid = section.find('.info-grid');
        const sectionId = section.attr('id');
        grid.empty();

        if (sectionId === 'section-personal') {
            editablePersonalFields.forEach(id => {
                let label = id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                if (id === 'zip_code') label = 'Postal Code';
                const isMandatory = mandatoryPersonalFields.includes(id);
                grid.append(createSummaryInfoItem(id, label, recordData.personal[id], { table: 'personal' }, { type: 'text' }, false, isMandatory));
            });
        } else {
            // Re-render just this category
            const category = section.find('.section-title').text().trim().replace(/^(.*)\s*[\ud83c-\udfff\ude80-\udf00]/g, '$1').trim(); // Remove icon/emoji
            const allRelevantFields = new Map(); // Need to recalculate this
            questions.forEach(q => {
                if (q.category === category) {
                    // Logic to populate allRelevantFields (from renderSummaryView) needs to be repeated here

                    if (q.id === 'accommodation_details') {
                        if (q.condition && q.condition(recordData.questions, recordData.personal)) {
                            const visaType = (recordData.personal.visa_type || '').toLowerCase();
                            let accommodationFields = [];

                            if (visaType.includes('tourist')) {
                                accommodationFields = [
                                    { id: 'hotel_name', label: 'Hotel Name', type: 'text' }, { id: 'hotel_address_1', label: 'Address Line 1', type: 'text' },
                                    { id: 'hotel_address_2', label: 'Address Line 2', type: 'text' }, { id: 'hotel_city', label: 'City', type: 'text' },
                                    { id: 'hotel_state', label: 'State/Province', type: 'text' }, { id: 'hotel_zip', label: 'Postal Code', type: 'text' },
                                    { id: 'hotel_contact_number', label: 'Hotel Contact', type: 'text' }, { id: 'hotel_booking_reference', label: 'Booking Reference', type: 'text' }
                                ];
                            } else if (visaType.includes('family') || visaType.includes('friend')) {
                                accommodationFields = [
                                    { id: 'inviting_person_first_name', label: 'Inviting Person First Name', type: 'text' }, { id: 'inviting_person_surname', label: 'Inviting Person Surname', type: 'text' },
                                    { id: 'inviting_person_email', label: 'Inviting Person Email', type: 'text' },
                                    { id: 'inviting_person_phone_code', label: 'Inviting Person Phone Code', type: 'text', col_class: 'half' }, { id: 'inviting_person_phone', label: 'Inviting Person Phone', type: 'text', col_class: 'half' },
                                    { id: 'inviting_person_relationship', label: 'Relationship', type: 'text' },
                                    { id: 'inviting_person_address_1', label: 'Address Line 1', type: 'text' }, { id: 'inviting_person_address_2', label: 'Address Line 2', type: 'text' },
                                    { id: 'inviting_person_city', label: 'City', type: 'text' }, { id: 'inviting_person_state', label: 'State/Province', type: 'text' }, { id: 'inviting_person_zip', label: 'Postal Code', type: 'text' }
                                ];
                            } else if (visaType.toLowerCase().includes('business')) {
                                accommodationFields = [
                                    { id: 'inviting_company_name', label: 'Company Name', type: 'text' }, { id: 'inviting_company_contact_person', label: 'Contact Person', type: 'text' },
                                    { id: 'inviting_company_address_1', label: 'Address Line 1', type: 'text' }, { id: 'inviting_company_address_2', label: 'Address Line 2', type: 'text' },
                                    { id: 'inviting_company_city', label: 'City', type: 'text' }, { id: 'inviting_company_state', label: 'State/Province', type: 'text' }, { id: 'inviting_company_zip', label: 'Postal Code', type: 'text' }, { id: 'inviting_company_phone', label: 'Company Phone', type: 'text' }
                                ];
                            }

                            accommodationFields.forEach(f => {
                                allRelevantFields.set(f.id, { label: f.label, value: recordData.questions[f.id], question: q, fieldDef: f, isMandatory: (f.label.includes('*')) });
                            });
                        }
                        return;
                    }

                    if (q.id === 'travel_sponsor') {
                        allRelevantFields.set(q.field, { label: q.text, value: recordData.questions[q.field], question: q, fieldDef: q, isMandatory: q.isMandatory });
                        let sponsorFields = [];
                        if (recordData.questions.travel_covered_by === 'Family Member / Family Member in the EU') {
                            sponsorFields = [
                                { id: 'sponsor_relation', label: 'Relation', type: 'select', options: ['Spouse / Civil Partner', 'Parent(s)', 'Sibling'] }, { id: 'sponsor_full_name', label: 'Full Name', type: 'text' },
                                { id: 'sponsor_address_1', label: 'Address Line 1', type: 'text' }, { id: 'sponsor_address_2', label: 'Address Line 2', type: 'text' },
                                { id: 'sponsor_city', label: 'City', type: 'text' }, { id: 'sponsor_state', label: 'State', type: 'text' }, { id: 'sponsor_zip', label: 'Postal Code', type: 'text' },
                                { id: 'sponsor_email', label: 'Email', type: 'text' }, { id: 'sponsor_phone', label: 'Phone', type: 'text' }
                            ];
                        } else if (recordData.questions.travel_covered_by === 'Host / Company / Organisation') {
                            sponsorFields = [
                                { id: 'host_name', label: 'Host Name', type: 'text' }, { id: 'host_phone', label: 'Host Phone', type: 'text' }, { id: 'host_company_name', label: 'Company Name', type: 'text' },
                                { id: 'host_address_1', label: 'Address Line 1', type: 'text' }, { id: 'host_address_2', label: 'Address Line 2', type: 'text' },
                                { id: 'host_city', label: 'City', type: 'text' }, { id: 'host_state', label: 'State', type: 'text' }, { id: 'host_zip', label: 'Postal Code', type: 'text' },
                                { id: 'host_email', label: 'Email', type: 'text' }, { id: 'host_company_phone', label: 'Company Phone', type: 'text' }
                            ];
                        }
                        sponsorFields.forEach(f => {
                            allRelevantFields.set(f.id, { label: f.label, value: recordData.questions[f.id], question: q, fieldDef: f, isMandatory: (f.label.includes('*')) });
                        });
                        return;
                    }


                    if (q.condition && !q.condition(recordData.questions, recordData.personal)) return;

                    if (q.fields) {
                        q.fields.forEach(f => {
                            const value = (q.table === 'personal' ? recordData.personal : recordData.questions)[f.id];
                            let label = f.placeholder ? f.placeholder.replace(' *', '') : (f.label || f.id);
                            if (f.id.endsWith('_zip')) label = 'Postal Code';
                            allRelevantFields.set(f.id, { label, value, question: q, fieldDef: f, isMandatory: (f.placeholder || f.label || '').includes('*') });
                        });
                    } else if (q.field) {
                        allRelevantFields.set(q.field, { label: q.text, value: recordData.questions[q.field], question: q, fieldDef: q, isMandatory: q.isMandatory });
                    }
                }
            });

            allRelevantFields.forEach((field, id) => {
                grid.append(createSummaryInfoItem(id, field.label, field.value, field.question, field.fieldDef, false, field.isMandatory));
            });
        }
    });

    $(document).on('click', '#summary-view .save-btn', function () {
        if (isFormLocked) return;
        const section = $(this).closest('.section');
        const personalUpdates = {};
        const questionUpdates = {};

        section.find('.info-item').each(function () {
            const item = $(this);
            if (item.data('readonly') || item.hasClass('hidden-field')) return;

            const field = item.data('field');
            const table = item.data('table');
            const input = item.find('.edit-input-field');

            if (!input.length || item.find('.summary-upload-area').length > 0) return; // Ignore file upload wrappers

            let newValue;
            if (input.attr('type') === 'checkbox') {
                newValue = input.is(':checked') ? 'Yes' : 'No';
            } else {
                newValue = input.val();
            }

            if (table === 'personal') {
                if (recordData.personal[field] !== newValue) {
                    personalUpdates[field] = newValue;
                    recordData.personal[field] = newValue; // Update local
                }
            } else {
                if (recordData.questions[field] !== newValue) {
                    questionUpdates[field] = newValue;
                    recordData.questions[field] = newValue; // Update local
                }
            }

            // Update display
            let displayValue = newValue;
            if (input.attr('type') === 'date') {
                displayValue = formatDateForDisplay(newValue);
            } else if (input.attr('type') === 'checkbox') {
                displayValue = newValue === 'Yes' ? 'Yes' : '<i>Not set</i>';
            }
            item.find('.display-value').html(displayValue || '<i>Not set</i>').toggleClass('not-set', !displayValue);
        });

        // ✅ FIX: Save personal data updates to database
        if (Object.keys(personalUpdates).length > 0) {
            savePersonalData(personalUpdates);
        }

        // ✅ FIX: Save question data updates to database
        if (Object.keys(questionUpdates).length > 0) {
            saveQuestionData(questionUpdates);
        }

        // Hide edit inputs, show display values
        section.find('.display-value').show();
        section.find('.edit-input-wrapper').hide();
        section.find('.cancel-btn').hide();
        $(this).html('<i class="fas fa-edit"></i> Edit').removeClass('save-btn');
    });


    // --- End of new summary logic ---

    $(document).on('click', '#proceed-to-submit-btn', function () {
        $(this).parent().remove();
        const confirmationHtml = `
            <div class="section" id="final-confirmation-section">
                 <h3 class="section-title"><i class="fas fa-check-circle"></i> Final Confirmation</h3>
                 <div class="confirmation-section" style="border:0; background:0; padding: 10px 0;">
                    <p class="confirmation-text" style="font-weight: 500; margin-bottom: 20px;">By submitting this form, I confirm and agree that:</p>
                    <label class="confirmation-label" for="confirm-accuracy-summary"><input type="checkbox" id="confirm-accuracy-summary"> All information provided is true, accurate, and complete.*</label>
                    <label class="confirmation-label" for="confirm-terms-summary"><input type="checkbox" id="confirm-terms-summary"> I agree to the <a href="https://www.visad.co.uk/terms-and-conditions/" target="_blank">Terms and Conditions</a>.</label>
                 </div>
                 <div class="navigation-buttons" style="margin-top: 20px;">
                    <span></span>
                    <button id="final-submit-btn" class="btn-primary" disabled>Submit Application & Lock <i class="fas fa-lock"></i></button>
                 </div>
            </div>
        `;
        $('#summary-actions-container').append(confirmationHtml);
    });

    $(document).on('change', '#confirm-accuracy-summary, #confirm-terms-summary', function () {
        const isReady = $('#confirm-accuracy-summary').is(':checked') && $('#confirm-terms-summary').is(':checked');
        $('#final-submit-btn').prop('disabled', !isReady);
    });

    $(document).on('click', '#final-submit-btn', function () {
        const btn = $(this);
        btn.prop('disabled', true).html('Submitting... <i class="fas fa-spinner fa-spin"></i>');
        saveQuestionData({ agreed_to_terms: '1' }, () => {
            // SPRING BOOT MIGRATION: Changed from api/public_api.php?action=mark_complete
            $.ajax({
                url: 'api/mark_complete',
                type: 'POST',
                contentType: 'application/json',
                dataType: 'json',
                data: JSON.stringify({ token }),
                success: res => {
                    if (res.status === 'success') {
                        isFormLocked = true;
                        recordData.questions.form_complete = '1';
                        $('.form-container').addClass('locked');
                        $('#final-confirmation-section').remove();
                        $('#summary-final-message').html('<i class="fas fa-lock"></i> Your application has been submitted successfully and is now locked for editing.').show();
                    }
                    else {
                        alert("Error: " + (res.message || 'Unknown error'));
                        btn.prop('disabled', false).html('Submit Application & Lock <i class="fas fa-lock"></i>');
                    }
                },
                error: () => {
                    alert("Server error.");
                    btn.prop('disabled', false).html('Submit Application & Lock <i class="fas fa-lock"></i>');
                }
            });
        });
    });

    // Old personal info edit logic (kept for that view)
    $(document).on('click', '#personal-info-edit-grid .info-item:not(.read-only):not(.no-hover) .display-value', function () { if (isFormLocked) return; $(this).hide().siblings('.edit-input').show().find('input').focus(); });
    $(document).on('click', '#personal-info-edit-grid .cancel-btn', function (e) { e.stopPropagation(); $(this).closest('.edit-input').hide().siblings('.display-value').show(); });
    $(document).on('click', '#personal-info-edit-grid .save-btn', function (e) {
        e.stopPropagation();
        if (isFormLocked) return;
        const item = $(this).closest('.info-item'), field = item.data('field'), input = item.find('input'), newValue = input.val().trim();
        recordData.personal[field] = newValue;
        item.find('.display-value').text(newValue || 'Not set').show();
        item.find('.edit-input').hide();
        checkPersonalInfoCompletion();
        savePersonalData({ [field]: newValue });
    });

    function updateGlobalProgressBar() {
        if (isFormLocked) {
            $('#progress-bar').css('width', '100%');
            $('#progress-text').text(`100% (Completed)`);
            return 100;
        }
        const qData = recordData.questions || {};
        const pData = recordData.personal || {};

        // Re-calculate all required fields
        const requiredFields = new Set([...mandatoryPersonalFields]);

        questions.forEach(q => {
            if (q.isMandatory && (!q.condition || q.condition(qData, pData))) {
                if (q.fields) {
                    q.fields.forEach(f => {
                        if ((f.placeholder || f.label || '').includes('*')) requiredFields.add(f.id);
                    });
                } else if (q.field) {
                    requiredFields.add(q.field);
                }
            }
        });

        if (qData.travel_covered_by === 'Family Member / Family Member in the EU') { ['sponsor_relation', 'sponsor_full_name', 'sponsor_address_1', 'sponsor_city', 'sponsor_state', 'sponsor_zip', 'sponsor_email', 'sponsor_phone'].forEach(f => requiredFields.add(f)); }
        else if (qData.travel_covered_by === 'Host / Company / Organisation') { ['host_name', 'host_phone', 'host_company_name', 'host_address_1', 'host_city', 'host_state', 'host_zip', 'host_email', 'host_company_phone'].forEach(f => requiredFields.add(f)); }

        const visaType = (pData.visa_type || '').toLowerCase();
        const isTouristStay = visaType.includes('tourist') && qData.has_stay_booking === 'Yes';
        const isFamilyStay = visaType.includes('family') || visaType.includes('friend');
        const isBusinessStay = visaType.includes('business');

        if (isTouristStay) {
            ['hotel_name', 'hotel_address_1', 'hotel_city', 'hotel_state', 'hotel_zip', 'hotel_contact_number'].forEach(id => requiredFields.add(id));
        } else if (isFamilyStay) {
            ['inviting_person_first_name', 'inviting_person_surname', 'inviting_person_email', 'inviting_person_phone_code', 'inviting_person_phone', 'inviting_person_relationship', 'inviting_person_address_1', 'inviting_person_city', 'inviting_person_state', 'inviting_person_zip'].forEach(id => requiredFields.add(id));
        } else if (isBusinessStay) {
            ['inviting_company_name', 'inviting_company_contact_person', 'inviting_company_address_1', 'inviting_company_city', 'inviting_company_state', 'inviting_company_zip', 'inviting_company_phone'].forEach(id => requiredFields.add(id));
        }

        let filledCount = 0;
        requiredFields.forEach(field => {
            const pValue = (pData[field] || '').trim();
            const qValue = qData[field]; // Don't trim here, it might be an array

            if (field.includes('_path') || field.includes('_image')) {
                let fileArray = [];
                if (Array.isArray(qValue)) {
                    fileArray = qValue;
                } else if (typeof qValue === 'string' && qValue.trim().startsWith('[')) {
                    try { fileArray = JSON.parse(qValue); } catch (e) { fileArray = []; }
                }
                if (fileArray.length > 0) {
                    filledCount++;
                }
            } else if (pValue !== '' || (qValue && String(qValue).trim() !== '')) {
                filledCount++;
            }
        });

        const totalFields = requiredFields.size;
        const percentage = totalFields > 0 ? Math.round((filledCount / totalFields) * 100) : 0;

        $('#progress-bar').css('width', percentage + '%');
        $('#progress-text').text(`${percentage}%`);
        return percentage;
    }

    // --- Date Helpers ---
    // Format for display in text (e.g., "Confirm Dates" or summary)
    const formatDateForDisplay = d => {
        if (!d) return '<i>Not set</i>';
        // Check if YYYY-MM-DD
        let parts = d.split('-');
        if (parts.length === 3 && parts[0].length === 4) {
            if (d === '0000-00-00') return '<i>Not set</i>';
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        // Check if DD/MM/YYYY
        parts = d.split('/');
        if (parts.length === 3 && parts[2].length === 4) {
            return d;
        }
        return d; // Return as is if unknown format
    };

    // Format from DB (YYYY-MM-DD) to input (YYYY-MM-DD) - basically a null check
    const convertDBDateToInput = d => {
        return d || '';
    };

    // Format from input (YYYY-MM-DD) to DB (YYYY-MM-DD) - also a null check
    const convertInputDateToDB = d => {
        return d || '';
    };

    // --- Date Validation & Recommendation Logic ---
    /**
     * Calculate the number of days between two dates (inclusive)
     * @param {string} dateFrom - Departure date in YYYY-MM-DD format
     * @param {string} dateTo - Return date in YYYY-MM-DD format
     * @returns {number} Number of days including both departure and return days
     */
    const calculateTripDuration = (dateFrom, dateTo) => {
        if (!dateFrom || !dateTo) return 0;

        const from = new Date(dateFrom);
        const to = new Date(dateTo);

        // Set both dates to start of day to avoid time zone issues
        from.setHours(0, 0, 0, 0);
        to.setHours(0, 0, 0, 0);

        // Calculate difference in milliseconds and convert to days
        const diffTime = to - from;
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        // Add 1 to include both departure and return days (inclusive calculation)
        // Example: Dec 4 to Dec 5 = 1 day difference + 1 = 2 days total
        return diffDays + 1;
    };

    /**
     * Check if departure date is at least 25 days from today and max 6 months
     * @param {string} departureDate - Departure date in YYYY-MM-DD format
     * @returns {object} { isValid: boolean, daysUntilDeparture: number, isTooFarOut: boolean }
     */
    const validateDepartureDate = (departureDate) => {
        if (!departureDate) return { isValid: false, daysUntilDeparture: 0, isTooFarOut: false };

        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison

        const departure = new Date(departureDate);
        departure.setHours(0, 0, 0, 0);

        // Calculate 6 months from today
        const sixMonthsFromToday = new Date(today);
        sixMonthsFromToday.setMonth(sixMonthsFromToday.getMonth() + 6);

        const diffTime = departure - today;
        const daysUntilDeparture = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const isTooFarOut = departure > sixMonthsFromToday;

        return {
            isValid: daysUntilDeparture >= 25 && !isTooFarOut,
            daysUntilDeparture: daysUntilDeparture,
            isTooFarOut: isTooFarOut
        };
    };

    /**
     * Generate recommendation message based on trip duration
     * @param {number} duration - Number of days
     * @param {object} questionData - Current question data to check for tour package
     * @param {string} departureDate - Departure date to validate timing
     * @returns {object} { type: 'info'|'warning'|'success', message: string }
     */
    const getDateRecommendation = (duration, questionData = {}, departureDate = null) => {
        if (duration === 0) {
            return {
                type: 'warning',
                message: 'Please ensure your return date is after your departure date.'
            };
        }

        // Check if departure date is at least 25 days from today and max 6 months
        if (departureDate) {
            const dateValidation = validateDepartureDate(departureDate);

            // Check if too far out (more than 6 months)
            if (dateValidation.isTooFarOut) {
                return {
                    type: 'warning',
                    message: `<strong>⚠️ Travel Date Too Far in Future</strong><br><br>
                        Please choose a travel date within 6 months duration.<br><br>
                        Your selected departure date is more than 6 months from today. Visa applications are typically processed for travel within 6 months.`
                };
            }

            // Check if too soon (less than 25 days)
            if (!dateValidation.isValid && dateValidation.daysUntilDeparture >= 0) {
                return {
                    type: 'warning',
                    message: `<strong>⚠️ Important Travel Date Notice</strong><br><br>
                        The visa processing time is approximately 20–30 days after the appointment. Please change your travel date accordingly.<br><br>
                        <strong>Current situation:</strong> Your departure is only ${dateValidation.daysUntilDeparture} day${dateValidation.daysUntilDeparture !== 1 ? 's' : ''} away.<br><br>
                        <strong>Recommendation:</strong> It is recommended to allow at least 35+ days between your appointment and travel date. This improves your chances of receiving a visa with a longer validity period (such as a 3-month visa).`
                };
            } else if (dateValidation.daysUntilDeparture < 0) {
                return {
                    type: 'warning',
                    message: '<strong>⚠️ Invalid Travel Date</strong><br><br>Your departure date is in the past. Please select a future date.'
                };
            }
        }

        if (duration <= 5) {
            return {
                type: 'success',
                message: `<strong>Great choice!</strong> A ${duration}-day trip is ideal for a short-duration Schengen visa. This aligns with your travel purpose and increases approval likelihood while preserving your remaining days within the 90-day Schengen limit.`
            };
        }

        // For trips longer than 5 days
        const hasTourPackage = questionData.has_bookings === 'Yes' ||
            (questionData.booking_documents_path &&
                (Array.isArray(questionData.booking_documents_path) &&
                    questionData.booking_documents_path.length > 0));

        if (hasTourPackage) {
            return {
                type: 'info',
                message: `<strong>Note:</strong> Your ${duration}-day trip is longer than the recommended 2-5 days. Since you have booking confirmations, please ensure you have:<br>
                    • A fully paid tour package or cruise booking with detailed itinerary<br>
                    • Proof of sufficient funds to cover all expenses during your trip<br><br>
                    These documents will support your application for an extended stay.`
            };
        }

        return {
            type: 'warning',
            message: `<strong>Recommendation:</strong> Your planned ${duration}-day trip exceeds the ideal 2-5 day duration for a short Schengen visa. Consider:<br><br>
                <strong>Why apply for a shorter stay (2-5 days)?</strong><br>
                • It aligns with your short trip purpose and appears more genuine<br>
                • It increases approval likelihood<br>
                • It preserves remaining days within the 90-day Schengen limit<br><br>
                <strong>To apply for ${duration} days, you must provide:</strong><br>
                • A fully paid tour package or cruise booking with detailed itinerary<br>
                • Proof of sufficient funds to cover all expenses<br><br>
                If you cannot provide these documents, we strongly recommend reducing your trip to 2-5 days.`
        };
    };

    /**
     * Display date recommendation in the UI
     * @param {number} duration - Number of days
     * @param {object} questionData - Current question data
     * @param {jQuery} container - Container element to display recommendation
     * @param {string} departureDate - Departure date for validation
     */
    const displayDateRecommendation = (duration, questionData, container, departureDate = null) => {
        // Remove any existing recommendation
        container.find('.date-recommendation').remove();

        if (duration === 0 && !departureDate) return;

        const recommendation = getDateRecommendation(duration, questionData, departureDate);

        const recommendationHTML = `
            <div class="date-recommendation ${recommendation.type}">
                <div class="recommendation-icon">
                    ${recommendation.type === 'success' ? '<i class="fas fa-check-circle"></i>' :
                recommendation.type === 'warning' ? '<i class="fas fa-exclamation-triangle"></i>' :
                    '<i class="fas fa-info-circle"></i>'}
                </div>
                <div class="recommendation-content">
                    <div class="recommendation-title">
                        ${recommendation.type === 'success' ? 'Optimal Duration' :
                recommendation.type === 'warning' ? 'Important Notice' :
                    'Additional Requirements'}
                    </div>
                    <div class="recommendation-message">${recommendation.message}</div>
                    ${duration > 0 ? `<div class="trip-duration-badge">
                        <i class="fas fa-calendar-alt"></i> Trip Duration: <strong>${duration} day${duration !== 1 ? 's' : ''}</strong>
                    </div>` : ''}
                </div>
            </div>
        `;

        // TASK 2 FIX: Insert warning BEFORE the navigation buttons (above Back button)
        // Find the navigation buttons and insert before them
        const navButtons = container.find('.navigation-buttons');
        if (navButtons.length > 0) {
            navButtons.before(recommendationHTML);
        } else {
            // Fallback: append if navigation buttons not found
            container.append(recommendationHTML);
        }
    };



    // ========== EDIT, SAVE, CANCEL HANDLERS FOR SUMMARY PAGE ==========

    // Edit button - Switch to edit mode
    $(document).on('click', '.edit-btn', function (e) {
        e.preventDefault();
        e.stopPropagation();

        console.log('Edit button clicked');

        // This logic is for an old, removed summary view.
        // The current summary edit logic is handled by the
        // handlers further down (e.g., $(document).on('click', '#summary-view .edit-btn', ...))

        // Leaving the old logic as commented out or removing completely is the best fix
        // since the file already contains a more robust in-section editing logic.
        // Given the goal is to fix the file, I'll remove the broken block entirely.

        /* REMOVED BROKEN CODE BLOCK HERE */
    });

    // Save button - Save changes from edit mode
    $(document).on('click', '.save-btn', function (e) {
        e.preventDefault();
        e.stopPropagation();

        console.log('Save button clicked');

        // This logic is for an old, removed summary view.
        // The current summary save logic is handled by the
        // handlers further down (e.g., $(document).on('click', '#summary-view .save-btn', ...))

        // Leaving the old logic as commented out or removing completely is the best fix
        // since the file already contains a more robust in-section editing logic.
        // Given the goal is to fix the file, I'll remove the broken block entirely.

        /* REMOVED BROKEN CODE BLOCK HERE */
    });

    // Cancel button - Discard changes and return to summary
    $(document).on('click', '.cancel-btn', function (e) {
        e.preventDefault();
        e.stopPropagation();

        console.log('Cancel button clicked');

        // This logic is for an old, removed summary view.
        // The current summary cancel logic is handled by the
        // handlers further down (e.g., $(document).on('click', '#summary-view .cancel-btn', ...))

        // Leaving the old logic as commented out or removing completely is the best fix
        // since the file already contains a more robust in-section editing logic.
        // Given the goal is to fix the file, I'll remove the broken block entirely.

        /* REMOVED BROKEN CODE BLOCK HERE */
    });


    // Enhanced save handler for file uploads and data
    function saveEditedData(section) {
        // Collect data from this section
        const sectionData = {};

        section.find('.edit-input-wrapper').each(function () {
            const parentItem = $(this).closest('.info-item');
            const fieldId = parentItem.data('field');
            const inputWrapper = $(this);

            // Get the input element
            const input = inputWrapper.find('input, select, textarea').first();
            if (input.length === 0) return;

            if (input.attr('type') === 'checkbox') {
                sectionData[fieldId] = input.is(':checked') ? 'Yes' : 'No';
            } else {
                sectionData[fieldId] = input.val();
            }
        });

        // Update recordData with new values
        Object.assign(recordData.questions || {}, sectionData);

        // Handle any file uploads in this section
        section.find('.file-input').each(function () {
            const inputName = $(this).attr('name');
            const fieldId = $(this).closest('.info-item').data('field');

            if (this.files && this.files.length > 0) {
                // Mark that files need to be uploaded
                recordData.pendingFileUploads = recordData.pendingFileUploads || {};
                recordData.pendingFileUploads[fieldId] = {
                    inputName: inputName,
                    files: this.files
                };
            }
        });

        return true;
    }

    // Enhanced AJAX save for all data including files
    function saveAllChanges() {
        // Collect all data
        collectFormData();

        // Prepare FormData if there are file uploads
        if (recordData.pendingFileUploads && Object.keys(recordData.pendingFileUploads).length > 0) {
            const formData = new FormData();
            formData.append('token', token);

            // Add data as JSON
            const dataToSend = {};
            Object.keys(recordData).forEach(key => {
                if (key !== 'pendingFileUploads') {
                    dataToSend[key] = recordData[key];
                }
            });
            formData.append('data', JSON.stringify(dataToSend));

            // Add files
            Object.keys(recordData.pendingFileUploads).forEach(fieldId => {
                const uploadInfo = recordData.pendingFileUploads[fieldId];
                const files = uploadInfo.files;
                for (let i = 0; i < files.length; i++) {
                    formData.append(uploadInfo.inputName, files[i]);
                }
            });

            // Use FormData for file upload
            return $.ajax({
                url: '<?php echo site_url("api/update_applicant_data"); ?>',
                type: 'POST',
                processData: false,
                contentType: false,
                data: formData,
                success: function (response) {
                    console.log('Data and files saved successfully:', response);

                    if (response.success) {
                        // Clear pending uploads
                        delete recordData.pendingFileUploads;

                        alert('Changes saved successfully!');
                        renderSummaryView();
                    } else {
                        alert('Error saving data: ' + (response.message || 'Unknown error'));
                    }
                },
                error: function (xhr, status, error) {
                    console.error('Error saving data:', error);
                    alert('Error saving changes: ' + error);
                }
            });
        } else {
            // No files, use regular AJAX
            return $.ajax({ // FIX 5: Un-commented and corrected the return statement
                url: '<?php echo site_url("api/update_applicant_data"); ?>',
                type: 'POST',
                dataType: 'json',
                data: {
                    token: token,
                    data: JSON.stringify(recordData)
                },
                success: function (response) {
                    console.log('Data updated successfully:', response);

                    if (response.success) {
                        alert('Changes saved successfully!');
                        renderSummaryView();
                    } else {
                        alert('Error saving data: ' + (response.message || 'Unknown error'));
                    }
                },
                error: function (xhr, status, error) {
                    console.error('Error updating data:', error);
                    alert('Error saving changes: ' + error);
                }
            });
        }
    }

    // Helper function to collect all form data
    function collectFormData() {
        // Collect text inputs, selects, and other form fields
        $('input[type="text"], input[type="email"], input[type="tel"], input[type="date"], select, textarea').each(function () {
            const name = $(this).attr('name');
            if (name) {
                recordData[name] = $(this).val();
            }
        });

        // Collect checkboxes
        $('input[type="checkbox"]').each(function () {
            const name = $(this).attr('name');
            if (name) {
                recordData[name] = $(this).is(':checked') ? 'yes' : 'no';
            }
        });

        console.log('Form data collected:', recordData);
    }

    // Helper function to validate mandatory fields
    function validateMandatoryFields() {
        let isValid = true;

        // The original code here relied on a non-existent 'formQuestions' array
        // We rely on the core validation logic in checkQuestionCompletion for the flow.
        // For the summary view, the 'save-btn' in summary view only saves data, not validates.
        // This helper is not called by the existing summary save logic, so I'll leave it as is
        // as removing it might break external calls, but it's likely a remnant.

        return isValid;
    }

    // ========== END OF EDIT, SAVE, CANCEL HANDLERS (The robust ones are above) ==========
});
// ===== CHECKBOX VALIDATION WITH SHAKE ANIMATION =====

// Function to validate and shake checkboxes
function validateCheckboxes() {
    let allValid = true;

    // Find all required checkboxes
    $('input[type="checkbox"][required], .required-checkbox').each(function () {
        const checkbox = $(this);
        const wrapper = checkbox.closest('.confirmation-checkbox, .date-confirmation-checkbox, .final-confirmation-checkbox, .checkbox-wrapper');

        if (!checkbox.is(':checked')) {
            allValid = false;

            // Add error class to checkbox
            checkbox.addClass('error validation-error');

            // Add error class to wrapper if it exists
            if (wrapper.length) {
                wrapper.addClass('error');

                // Add error message if it doesn't exist
                if (!wrapper.find('.checkbox-error-message').length) {
                    wrapper.append('<div class="checkbox-error-message"><i class="fas fa-exclamation-circle"></i> Please check this box to continue</div>');
                }
            }

            // Remove error class after animation completes
            setTimeout(function () {
                checkbox.removeClass('validation-error');
            }, 1000);
        } else {
            // Remove error state if checked
            checkbox.removeClass('error validation-error');
            if (wrapper.length) {
                wrapper.removeClass('error');
                wrapper.find('.checkbox-error-message').remove();
            }
        }
    });

    return allValid;
}

// Add validation to checkboxes on change
$(document).on('change', 'input[type="checkbox"]', function () {
    const checkbox = $(this);
    const wrapper = checkbox.closest('.confirmation-checkbox, .date-confirmation-checkbox, .final-confirmation-checkbox, .checkbox-wrapper');

    if (checkbox.is(':checked')) {
        checkbox.removeClass('error validation-error');
        if (wrapper.length) {
            wrapper.removeClass('error');
            wrapper.find('.checkbox-error-message').remove();
        }
    }
});

// Override the continue button click to validate checkboxes
$(document).on('click', '.btn-primary:contains("Continue"), .next-question-btn', function (e) {
    const disabled = $(this).prop('disabled');

    // If button is already disabled, don't validate
    if (disabled) {
        return;
    }

    // Validate checkboxes
    if (!validateCheckboxes()) {
        e.preventDefault();
        e.stopPropagation();

        // Scroll to first error
        const firstError = $('.checkbox.error, input[type="checkbox"].error').first();
        if (firstError.length) {
            $('html, body').animate({
                scrollTop: firstError.offset().top - 100
            }, 300);
        }

        return false;
    }
});

// Mark checkboxes as required
$(document).ready(function () {
    // Add required attribute to confirmation checkboxes
    $('.confirmation-checkbox input[type="checkbox"], .date-confirmation-checkbox input[type="checkbox"], .final-confirmation-checkbox input[type="checkbox"]').attr('required', 'required');

    // Add required-checkbox class for easier selection
    $('.confirmation-checkbox input[type="checkbox"], .date-confirmation-checkbox input[type="checkbox"], .final-confirmation-checkbox input[type="checkbox"]').addClass('required-checkbox');
});