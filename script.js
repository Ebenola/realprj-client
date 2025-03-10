const BASE_URL = 'https://your-heroku-app.herokuapp.com/api'; // Update with Heroku URL
const CLOUDINARY_UPLOAD_PRESET = 'your-upload-preset';
const CLOUDINARY_CLOUD_NAME = 'your-cloud-name';

// Predefined states and cities for sellers
const sellerLocations = {
    "Lagos": ["Ikeja", "Lekki", "Victoria Island", "Ajah", "Ibeju-Lekki",
        "Epe","Surulere", "Yaba", "Ketu", "Oke-Odo", "Agege", "Apapa", 
        "Iganmu", "Ipaja", "Badagry", "Egbe"],
    "Abuja": ["Garki", "Wuse", "Wuse 2", "Asokoro", "Maitama", "Gwarinpa",
        "Central Area Phase 2", "Central Business District", "Diplomatic Zones",
        "Cultural Zones", "Katampe", "Lugbe"],
    "Rivers": ["Port Harcourt", "Obio/Akpor", "Bonny"],
    "Ogun": ["Abeokuta", "Ijebu Ode", "Sango Ota"],
    "Kano": ["Kano City", "Dala", "Fagge"],
    "Oyo": ["Ibadan", "Ogbomosho", "Oyo"],
    "Enugu": ["Enugu", "Nsukka"],
    "Kaduna": ["Kaduna", "Zaria", "Kafanchan"],
    "Akwa Ibom": ["Uyo", "Nwaniba Road", "Oron Road", "Eket", "Ikot-Ekpene", "Oron"],
    "Cross-River": ["Calabar", "Ikom"],
    "Abia": ["Umuahia", "Aba"],
    // Expand as needed
};

// Toast notification helper
function showToast(message, type = 'info') {
    Toastify({
        text: message,
        duration: 3000,
        gravity: 'top',
        position: 'right',
        backgroundColor: type === 'error' ? '#dc3545' : '#28a745',
    }).showToast();
}

// Populate seller state dropdown
function populateSellerStates() {
    const states = Object.keys(sellerLocations);
    const sellerState = document.getElementById('state');
    if (sellerState) {
        states.forEach(state => {
            const option = document.createElement('option');
            option.value = state;
            option.textContent = state;
            sellerState.appendChild(option);
        });
    }
}

// Update seller city dropdown
function updateCitySeller() {
    const state = document.getElementById('state').value;
    const citySelect = document.getElementById('city');
    citySelect.innerHTML = '<option value="">Select City</option>';
    
    if (state && sellerLocations[state]) {
        sellerLocations[state].forEach(city => {
            const option = document.createElement('option');
            option.value = city;
            option.textContent = city;
            citySelect.appendChild(option);
        });
    }
}

// Fetch and populate buyer state dropdown
async function populateBuyerStates() {
    const filterState = document.getElementById('filterState');
    if (!filterState) return;

    try {
        const response = await fetch(`${BASE_URL}/states`);
        if (!response.ok) throw new Error('Failed to fetch states');
        const states = await response.json();
        states.forEach(state => {
            const option = document.createElement('option');
            option.value = state;
            option.textContent = state;
            filterState.appendChild(option);
        });
    } catch (error) {
        showToast('Error loading states', 'error');
    }
}

// Update buyer city dropdown
async function updateCityFilter() {
    const state = document.getElementById('filterState').value;
    const citySelect = document.getElementById('filterCity');
    citySelect.innerHTML = '<option value="">All Cities</option>';

    if (state) {
        try {
            const response = await fetch(`${BASE_URL}/cities?state=${encodeURIComponent(state)}`);
            if (!response.ok) throw new Error('Failed to fetch cities');
            const cities = await response.json();
            cities.forEach(city => {
                const option = document.createElement('option');
                option.value = city;
                option.textContent = city;
                citySelect.appendChild(option);
            });
        } catch (error) {
            showToast('Error loading cities', 'error');
        }
    }
}

// Main page logic
if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
    let map, scene, camera, renderer, controls;

    window.onload = async () => {
        await populateBuyerStates();
        fetchProperties(1);
    };

    async function fetchProperties(page) {
        document.getElementById('featuredListings').innerHTML = '<div class="spinner"></div>';
        document.getElementById('allListings').innerHTML = '<div class="spinner"></div>';

        const query = new URLSearchParams({
            search: document.getElementById('search').value || '',
            type: document.getElementById('filterType').value || '',
            minPrice: document.getElementById('minPrice').value || '',
            maxPrice: document.getElementById('maxPrice').value || '',
            state: document.getElementById('filterState').value || '',
            city: document.getElementById('filterCity').value || '',
            limitFeatured: 10,
            page,
            limit: 10,
        }).toString();

        try {
            const response = await fetch(`${BASE_URL}/properties?${query}`);
            if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch properties');
            const { properties, total, page: currentPage, pages } = await response.json();
            const featured = properties.filter(p => p.promotionExpiry && new Date(p.promotionExpiry) > new Date());

            document.getElementById('featuredListings').innerHTML = featured.length ? featured.map(p => `
                <div class="property-card" onclick="showDetails('${p._id}')">
                    <h3>${p.title}</h3>
                    <p>${p.price} NGN</p>
                    <p>${p.city}, ${p.state}</p>
                </div>
            `).join('') : 'No featured listings.';
            document.getElementById('allListings').innerHTML = properties.length ? properties.map(p => `
                <div class="property-card" onclick="showDetails('${p._id}')">
                    <h3>${p.title}</h3>
                    <p>${p.price} NGN</p>
                    <p>${p.city}, ${p.state}</p>
                </div>
            `).join('') : 'No listings available.';

            const pagination = document.getElementById('pagination');
            pagination.innerHTML = '';
            if (pages > 1) {
                if (currentPage > 1) {
                    pagination.innerHTML += `<button onclick="fetchProperties(${currentPage - 1})">Previous</button>`;
                }
                for (let i = 1; i <= pages; i++) {
                    pagination.innerHTML += `<button ${i === currentPage ? 'disabled' : ''} onclick="fetchProperties(${i})">${i}</button>`;
                }
                if (currentPage < pages) {
                    pagination.innerHTML += `<button onclick="fetchProperties(${currentPage + 1})">Next</button>`;
                }
            }
        } catch (error) {
            showToast(`Error fetching properties: ${error.message}`, 'error');
            document.getElementById('featuredListings').innerHTML = 'Error loading listings.';
            document.getElementById('allListings').innerHTML = 'Error loading listings.';
        }
    }

    async function showDetails(id) {
        document.getElementById('details3d').innerHTML = '<div class="spinner"></div>';
        try {
            const response = await fetch(`${BASE_URL}/properties?_id=${id}`);
            if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch property');
            const [property] = await response.json();
            document.getElementById('propertyDetails').style.display = 'block';
            document.getElementById('detailsTitle').textContent = property.title;
            document.getElementById('detailsDescription').textContent = property.description;
            document.getElementById('detailsPrice').textContent = `${property.price} NGN`;
            document.getElementById('detailsLocation').textContent = `${property.city}, ${property.state}`;
            document.getElementById('detailsPictures').innerHTML = property.pictures.map(url => `<img src="${url}" alt="Property" style="max-width: 200px;">`).join('');

            const [lat, lng] = property.location.split(',').map(Number);
            map = new google.maps.Map(document.getElementById('detailsMap'), {
                center: { lat, lng },
                zoom: 15,
            });
            new google.maps.Marker({ position: { lat, lng }, map });

            if (property.model3d) {
                scene = new THREE.Scene();
                camera = new THREE.PerspectiveCamera(75, window.innerWidth / 400, 0.1, 1000);
                renderer = new THREE.WebGLRenderer();
                renderer.setSize(window.innerWidth * 0.8, 400);
                document.getElementById('details3d').innerHTML = '';
                document.getElementById('details3d').appendChild(renderer.domElement);

                const loader = new THREE.GLTFLoader();
                loader.load(property.model3d, (gltf) => {
                    scene.add(gltf.scene);
                    controls = new THREE.OrbitControls(camera, renderer.domElement);
                    camera.position.z = 5;
                    animate();
                }, undefined, () => {
                    document.getElementById('details3d').innerHTML = 'Error loading 3D model.';
                });
            } else {
                document.getElementById('details3d').innerHTML = 'No 3D model available.';
            }
        } catch (error) {
            showToast(`Error showing details: ${error.message}`, 'error');
            document.getElementById('details3d').innerHTML = 'Error loading details.';
        }
    }

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }

    function closeDetails() {
        document.getElementById('propertyDetails').style.display = 'none';
    }
}

// Seller and Admin portal logic
if (window.location.pathname.endsWith('seller.html') || window.location.pathname.endsWith('admin.html')) {
    let token = localStorage.getItem('token');
    const FLUTTERWAVE_PUBLIC_KEY = 'FLWPUBK_TEST-your-public-key';

    window.onload = () => {
        populateSellerStates();
        if (token) {
            if (window.location.pathname.endsWith('seller.html')) {
                showDashboard();
            } else if (window.location.pathname.endsWith('admin.html')) {
                showAdminDashboard();
            }
        }
    };

    function showRegister() {
        document.getElementById('registerFormSection').style.display = 'block';
        document.getElementById('loginFormSection').style.display = 'none';
        document.getElementById('verifyFormSection').style.display = 'none';
        document.getElementById('dashboardSection').style.display = 'none';
        document.getElementById('propertyFormSection').style.display = 'none';
        document.getElementById('retry3dFormSection').style.display = 'none';
    }

    function showLogin() {
        document.getElementById('registerFormSection').style.display = 'none';
        document.getElementById('loginFormSection').style.display = 'block';
        document.getElementById('verifyFormSection').style.display = 'none';
        document.getElementById('dashboardSection').style.display = 'none';
        document.getElementById('propertyFormSection').style.display = 'none';
        document.getElementById('retry3dFormSection').style.display = 'none';
    }

    function showVerify() {
        document.getElementById('registerFormSection').style.display = 'none';
        document.getElementById('loginFormSection').style.display = 'none';
        document.getElementById('verifyFormSection').style.display = 'block';
        document.getElementById('dashboardSection').style.display = 'none';
        document.getElementById('propertyFormSection').style.display = 'none';
        document.getElementById('retry3dFormSection').style.display = 'none';
    }

    function showDashboard() {
        document.getElementById('registerFormSection').style.display = 'none';
        document.getElementById('loginFormSection').style.display = 'none';
        document.getElementById('verifyFormSection').style.display = 'none';
        document.getElementById('dashboardSection').style.display = 'block';
        document.getElementById('propertyFormSection').style.display = 'none';
        document.getElementById('retry3dFormSection').style.display = 'none';
        fetchSellerProperties();
    }

    function showPropertyForm() {
        document.getElementById('propertyFormSection').style.display = 'block';
        document.getElementById('dashboardSection').style.display = 'none';
        document.getElementById('retry3dFormSection').style.display = 'none';
    }

    async function showRetry3dForm(propertyId) {
        document.getElementById('retryPropertyId').value = propertyId;
        try {
            const response = await fetch(`${BASE_URL}/seller/properties`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!response.ok) throw new Error('Failed to fetch properties');
            const properties = await response.json();
            const property = properties.find(p => p._id === propertyId);
            if (property.model3dInput) {
                document.getElementById('retryPhoto3d').checked = true;
                document.getElementById('retryModel3dInput').value = JSON.stringify(property.model3dInput);
            } else if (property.model3dVideo) {
                document.getElementById('retryVideo3d').checked = true;
                document.getElementById('retryModel3dVideo').value = property.model3dVideo;
            }
        } catch (error) {
            showToast('Error loading retry data', 'error');
        }
        document.getElementById('propertyFormSection').style.display = 'none';
        document.getElementById('dashboardSection').style.display = 'none';
        document.getElementById('retry3dFormSection').style.display = 'block';
    }

    function toggle3dInput() {
        const bypass = document.getElementById('bypass3d').checked;
        document.getElementById('model3dInputContainer').style.display = bypass ? 'none' : 'block';
    }

    function toggleRetry3dInput() {
        document.getElementById('retryModel3dInput').value = '';
        document.getElementById('retryModel3dVideo').value = '';
    }

    function uploadPictures() {
        cloudinary.openUploadWidget({
            cloudName: CLOUDINARY_CLOUD_NAME,
            uploadPreset: CLOUDINARY_UPLOAD_PRESET,
            sources: ['local', 'camera'],
            multiple: true,
            maxFiles: 10,
            resourceType: 'image',
            clientAllowedFormats: ['jpeg', 'png'],
        }, (error, result) => {
            if (!error && result && result.event === 'success') {
                const urls = result.info.files.map(file => file.uploadInfo.secure_url);
                document.getElementById('pictures').value = JSON.stringify(urls);
                showToast('Pictures uploaded successfully');
            }
        });
    }

    function upload3dFiles() {
        const isPhotos = document.getElementById('photo3d').checked;
        cloudinary.openUploadWidget({
            cloudName: CLOUDINARY_CLOUD_NAME,
            uploadPreset: CLOUDINARY_UPLOAD_PRESET,
            sources: ['local', 'camera'],
            multiple: isPhotos,
            maxFiles: isPhotos ? 10 : 1,
            resourceType: isPhotos ? 'image' : 'video',
            clientAllowedFormats: isPhotos ? ['jpeg', 'png'] : ['mp4'],
        }, (error, result) => {
            if (!error && result && result.event === 'success') {
                const urls = result.info.files.map(file => file.uploadInfo.secure_url);
                if (isPhotos) {
                    document.getElementById('model3dInput').value = JSON.stringify(urls);
                } else {
                    document.getElementById('model3dVideo').value = urls[0];
                }
                showToast('3D files uploaded successfully');
            }
        });
    }

    function uploadRetry3dFiles() {
        const isPhotos = document.getElementById('retryPhoto3d').checked;
        cloudinary.openUploadWidget({
            cloudName: CLOUDINARY_CLOUD_NAME,
            uploadPreset: CLOUDINARY_UPLOAD_PRESET,
            sources: ['local', 'camera'],
            multiple: isPhotos,
            maxFiles: isPhotos ? 10 : 1,
            resourceType: isPhotos ? 'image' : 'video',
            clientAllowedFormats: isPhotos ? ['jpeg', 'png'] : ['mp4'],
        }, (error, result) => {
            if (!error && result && result.event === 'success') {
                const urls = result.info.files.map(file => file.uploadInfo.secure_url);
                if (isPhotos) {
                    document.getElementById('retryModel3dInput').value = JSON.stringify(urls);
                } else {
                    document.getElementById('retryModel3dVideo').value = urls[0];
                }
                showToast('Retry files uploaded successfully');
            }
        });
    }

    document.getElementById('registerForm').addEventListener('submit', async e => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        try {
            const response = await fetch(`${BASE_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (response.ok) {
                showToast('Registration successful! Check email for code.');
                showVerify();
                document.getElementById('verifyEmail').value = data.email;
            } else {
                const error = await response.json();
                showToast(`Error: ${error.error}`, 'error');
            }
        } catch (error) {
            showToast('Error registering.', 'error');
        }
    });

    document.getElementById('loginForm').addEventListener('submit', async e => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        try {
            const response = await fetch(`${BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (response.ok) {
                const { token: newToken } = await response.json();
                token = newToken;
                localStorage.setItem('token', token);
                showDashboard();
                showToast('Logged in successfully');
            } else {
                const error = await response.json();
                showToast(`Error: ${error.error}`, 'error');
            }
        } catch (error) {
            showToast('Error logging in.', 'error');
        }
    });

    document.getElementById('verifyForm').addEventListener('submit', async e => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        try {
            const response = await fetch(`${BASE_URL}/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (response.ok) {
                const { token: newToken } = await response.json();
                token = newToken;
                localStorage.setItem('token', token);
                showDashboard();
                showToast('Email verified successfully');
            } else {
                const error = await response.json();
                showToast(`Error: ${error.error}`, 'error');
            }
        } catch (error) {
            showToast('Error verifying.', 'error');
        }
    });

    async function resendCode() {
        const email = document.getElementById('verifyEmail').value;
        try {
            const response = await fetch(`${BASE_URL}/resend-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            if (response.ok) {
                showToast('Code resent! Check email.');
            } else {
                const error = await response.json();
                showToast(`Error: ${error.error}`, 'error');
            }
        } catch (error) {
            showToast('Error resending code.', 'error');
        }
    }

    function logout() {
        token = null;
        localStorage.removeItem('token');
        showLogin();
        showToast('Logged out');
    }

    async function fetchSellerProperties() {
        document.getElementById('sellerProperties').innerHTML = '<div class="spinner"></div>';
        try {
            const response = await fetch(`${BASE_URL}/seller/properties`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch properties');
            const properties = await response.json();
            document.getElementById('sellerProperties').innerHTML = properties.map(p => `
                <div class="property-card">
                    <h3>${p.title}</h3>
                    <p>${p.price} NGN</p>
                    <p>${p.city}, ${p.state}</p>
                    <p>3D Status: ${p.model3dStatus}</p>
                    ${p.model3dStatus === 'failed' ? `<button onclick="showRetry3dForm('${p._id}')">Retry 3D</button>` : ''}
                    <input type="checkbox" class="promote-checkbox" value="${p._id}" ${p.promotionExpiry && new Date(p.promotionExpiry) > new Date() ? 'disabled' : ''}>
                    <button class="delete" onclick="deleteProperty('${p._id}')">Delete</button>
                </div>
            `).join('') || 'No properties listed.';
            if (properties.length) {
                document.getElementById('sellerProperties').innerHTML += `
                    <button onclick="promoteListings()">Promote Selected (500 NGN each)</button>
                `;
            }
        } catch (error) {
            showToast(`Error fetching properties: ${error.message}`, 'error');
            document.getElementById('sellerProperties').innerHTML = 'Error loading properties.';
            logout();
        }
    }

    async function deleteProperty(id) {
        if (!confirm('Are you sure you want to delete this property?')) return;
        try {
            const response = await fetch(`${BASE_URL}/properties/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (response.ok) {
                showToast('Property deleted successfully');
                fetchSellerProperties(); // Refresh the list
            } else {
                const error = await response.json();
                showToast(`Error: ${error.error}`, 'error');
            }
        } catch (error) {
            showToast('Error deleting property', 'error');
        }
    }

    // Add admin-specific functions
    function showAdminDashboard() {
        document.getElementById('loginFormSection').style.display = 'none';
        document.getElementById('adminDashboard').style.display = 'block';
        fetchAllProperties();
    }

    async function fetchAllProperties() {
        document.getElementById('allProperties').innerHTML = '<div class="spinner"></div>';
        try {
            const response = await fetch(`${BASE_URL}/properties`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch properties');
            const { properties } = await response.json();
            document.getElementById('allProperties').innerHTML = properties.map(p => `
                <div class="property-card">
                    <h3>${p.title}</h3>
                    <p>${p.price} NGN</p>
                    <p>${p.city}, ${p.state}</p>
                    <p>Seller ID: ${p.seller}</p>
                    <button class="delete" onclick="adminDeleteProperty('${p._id}')">Delete</button>
                </div>
            `).join('') || 'No properties listed.';
        } catch (error) {
            showToast(`Error fetching properties: ${error.message}`, 'error');
            document.getElementById('allProperties').innerHTML = 'Error loading properties.';
            logout();
        }
    }

    async function adminDeleteProperty(id) {
        if (!confirm('Are you sure you want to delete this property?')) return;
        try {
            const response = await fetch(`${BASE_URL}/admin/properties/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (response.ok) {
                showToast('Property deleted by admin');
                fetchAllProperties(); // Refresh the list
            } else {
                const error = await response.json();
                showToast(`Error: ${error.error}`, 'error');
            }
        } catch (error) {
            showToast('Error deleting property', 'error');
        }
    }

    document.getElementById('adminLoginForm')?.addEventListener('submit', async e => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        try {
            const response = await fetch(`${BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (response.ok) {
                const { token: newToken } = await response.json();
                token = newToken;
                localStorage.setItem('token', token);
                showAdminDashboard();
                showToast('Logged in as admin');
            } else {
                const error = await response.json();
                showToast(`Error: ${error.error}`, 'error');
            }
        } catch (error) {
            showToast('Error logging in.', 'error');
        }
    });

    document.getElementById('propertyForm').addEventListener('submit', async e => {
        e.preventDefault();
        const formData = new FormData(e.target);
        formData.append('bypass3d', document.getElementById('bypass3d').checked.toString());
        const data = Object.fromEntries(formData);

        try {
            const response = await fetch(`${BASE_URL}/properties`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (response.ok) {
                const property = await response.json();
                showToast(`Property listed! ${property.model3dStatus === 'pending' ? '3D processing started.' : ''}`);
                e.target.reset();
                showDashboard();
            } else {
                const error = await response.json();
                showToast(`Error: ${error.error}`, 'error');
            }
        } catch (error) {
            showToast('Error listing property.', 'error');
        }
    });

    document.getElementById('retry3dForm').addEventListener('submit', async e => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const propertyId = document.getElementById('retryPropertyId').value;
        const data = Object.fromEntries(formData);

        try {
            const response = await fetch(`${BASE_URL}/properties/${propertyId}/retry-3d`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (response.ok) {
                showToast('3D processing retry queued!');
                showDashboard();
            } else {
                const error = await response.json();
                showToast(`Error: ${error.error}`, 'error');
            }
        } catch (error) {
            showToast('Error retrying 3D.', 'error');
        }
    });

    async function promoteListings() {
        const selected = Array.from(document.querySelectorAll('.promote-checkbox:checked')).map(cb => cb.value);
        if (!selected.length) return showToast('Select properties to promote.', 'error');

        try {
            const email = prompt('Enter your email for payment:');
            if (!email) return;

            const response = await fetch(`${BASE_URL}/promote`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ propertyIds: selected, email }),
            });
            if (!response.ok) throw new Error((await response.json()).error || 'Failed to initiate promotion');
            const { txRef, amount } = await response.json();

            FlutterwaveCheckout({
                public_key: FLUTTERWAVE_PUBLIC_KEY,
                tx_ref: txRef,
                amount,
                currency: 'NGN',
                customer: { email },
                callback: async (data) => {
                    if (data.status === 'successful') {
                        fetchSellerProperties();
                        showToast('Promotion successful');
                    }
                },
                onclose: () => {},
            });
        } catch (error) {
            showToast(`Error promoting listings: ${error.message}`, 'error');
        }
    }
}