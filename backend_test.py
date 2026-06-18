#!/usr/bin/env python3
"""
Backend test suite for KCET Multi-Quota Prediction Engine.
Tests the three NEW backend tasks:
1. /api/predict with multi-quota engine
2. /api/payment/create-order with multi-quota payload
3. /api/payment/verify with PDF generation using multi-quota engine
"""

import requests
import json
import hmac
import hashlib
import time
import os

BASE_URL = "https://kcet.preview.emergentagent.com/api"
RAZORPAY_KEY_SECRET = "EF8t4J0HipGamYuDKAntQAJt"

def print_test(name):
    print(f"\n{'='*80}")
    print(f"TEST: {name}")
    print('='*80)

def print_pass(msg):
    print(f"✅ PASS: {msg}")

def print_fail(msg):
    print(f"❌ FAIL: {msg}")

def print_info(msg):
    print(f"ℹ️  INFO: {msg}")

# ============================================================================
# TASK 1: /api/predict — Multi-Quota Engine
# ============================================================================

def test_predict_multi_quota_expansion():
    """Test A: Multi-quota expansion for 2A+Rural+Kannada"""
    print_test("A. Multi-quota expansion: 2A+Rural+Kannada → [2AR,2AK,2AG,GMR,GMK,GM]")
    
    payload = {
        "rank": 10000,
        "baseCategory": "2A",
        "rural": True,
        "kannada": True,
        "course": "CS",
        "round": "R1"
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/predict", json=payload, timeout=30)
        print_info(f"Status: {resp.status_code}")
        
        if resp.status_code != 200:
            print_fail(f"Expected 200, got {resp.status_code}")
            print_info(f"Response: {resp.text[:500]}")
            return False
        
        data = resp.json()
        
        # Check ok: true
        if not data.get('ok'):
            print_fail("Response missing 'ok: true'")
            return False
        print_pass("Response has 'ok: true'")
        
        # Check meta.eligibleCategories
        eligible = data.get('meta', {}).get('eligibleCategories', [])
        if not eligible:
            print_fail("meta.eligibleCategories is empty")
            return False
        
        codes = [c['code'] for c in eligible]
        print_info(f"Eligible categories: {codes}")
        
        # Expected order: 2AR, 2AK, 2AG, GMR, GMK, GM (+ any special)
        expected_start = ['2AR', '2AK', '2AG', 'GMR', 'GMK', 'GM']
        if codes[:6] != expected_start:
            print_fail(f"Expected first 6 codes to be {expected_start}, got {codes[:6]}")
            return False
        print_pass(f"Eligible categories correctly ordered: {codes[:6]}")
        
        # Check meta.profileLabel
        profile_label = data.get('meta', {}).get('profileLabel')
        if not profile_label:
            print_fail("meta.profileLabel is missing")
            return False
        print_pass(f"meta.profileLabel: {profile_label}")
        
        # Check meta.effectiveYear
        effective_year = data.get('meta', {}).get('effectiveYear')
        if effective_year is None:
            print_fail("meta.effectiveYear is missing")
            return False
        print_pass(f"meta.effectiveYear: {effective_year}")
        
        # Check results array
        results = data.get('results', [])
        if not results:
            print_fail("results array is empty")
            return False
        print_pass(f"results array has {len(results)} entries")
        
        # Check first result structure
        first = results[0]
        required_fields = ['college_code', 'college_name', 'tier', 'course_code', 'course_name',
                          'bestQuota', 'bestQuotaLabel', 'bestCutoff', 'studentRank', 
                          'margin', 'confidence', 'probability', 'matchedQuotas', 'consideredQuotas']
        for field in required_fields:
            if field not in first:
                print_fail(f"Result missing field: {field}")
                return False
        print_pass("Result structure has all required fields")
        
        # Check grouped object
        grouped = data.get('grouped', {})
        expected_keys = ['Safe', 'High Chance', 'Borderline', 'Low Chance', 'Not Likely']
        if set(grouped.keys()) != set(expected_keys):
            print_fail(f"grouped keys mismatch. Expected {expected_keys}, got {list(grouped.keys())}")
            return False
        print_pass(f"grouped has exactly 5 confidence buckets")
        
        # Check sectionB array
        section_b = data.get('sectionB', [])
        if not section_b:
            print_fail("sectionB array is empty")
            return False
        print_pass(f"sectionB array has {len(section_b)} entries")
        
        # Check first sectionB structure
        first_sb = section_b[0]
        sb_fields = ['college_code', 'college_name', 'tier', 'city', 'courses']
        for field in sb_fields:
            if field not in first_sb:
                print_fail(f"sectionB entry missing field: {field}")
                return False
        print_pass("sectionB structure correct")
        
        # Verify at least one result has multiple matchedQuotas (proving multi-quota matching)
        multi_quota_found = False
        for r in results:
            if len(r.get('matchedQuotas', [])) >= 2:
                multi_quota_found = True
                print_pass(f"Found result with {len(r['matchedQuotas'])} matched quotas (multi-quota matching works)")
                break
        
        if not multi_quota_found:
            print_info("No result with multiple matchedQuotas found (may be OK if rank is high)")
        
        return True
        
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_predict_confidence_math():
    """Test B: Verify confidence math and probability"""
    print_test("B. Confidence math: margin%, confidence buckets, probability")
    
    payload = {
        "rank": 15000,
        "baseCategory": "GM",
        "course": "CS",
        "round": "R1"
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/predict", json=payload, timeout=30)
        if resp.status_code != 200:
            print_fail(f"Expected 200, got {resp.status_code}")
            return False
        
        data = resp.json()
        results = data.get('results', [])
        
        if not results:
            print_fail("No results to verify")
            return False
        
        # Check first 3 results
        for i, r in enumerate(results[:3]):
            cutoff = r['bestCutoff']
            rank = r['studentRank']
            margin = r['margin']
            confidence = r['confidence']
            probability = r['probability']
            
            # Verify margin calculation
            expected_margin = ((cutoff - rank) / cutoff) * 100
            if abs(margin - expected_margin) > 0.01:
                print_fail(f"Result {i}: margin mismatch. Expected {expected_margin:.2f}, got {margin:.2f}")
                return False
            
            # Verify confidence bucket
            if margin >= 20:
                expected_conf = 'Safe'
            elif margin >= 10:
                expected_conf = 'High Chance'
            elif margin >= 0:
                expected_conf = 'Borderline'
            elif margin >= -10:
                expected_conf = 'Low Chance'
            else:
                expected_conf = 'Not Likely'
            
            if confidence != expected_conf:
                print_fail(f"Result {i}: confidence mismatch. Expected {expected_conf}, got {confidence}")
                return False
            
            # Verify probability range
            if not (10 <= probability <= 99):
                print_fail(f"Result {i}: probability {probability} out of range [10, 99]")
                return False
            
            print_pass(f"Result {i}: margin={margin:.2f}%, confidence={confidence}, probability={probability}%")
        
        return True
        
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_predict_best_quota_rule():
    """Test C: Best-quota rule (largest cutoff wins)"""
    print_test("C. Best-quota rule: bestQuota = matched quota with LARGEST cutoff")
    
    payload = {
        "rank": 12000,
        "baseCategory": "2A",
        "rural": True,
        "course": "CS",
        "round": "R1"
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/predict", json=payload, timeout=30)
        if resp.status_code != 200:
            print_fail(f"Expected 200, got {resp.status_code}")
            return False
        
        data = resp.json()
        results = data.get('results', [])
        
        # Find results with multiple matchedQuotas
        multi_quota_results = [r for r in results if len(r.get('matchedQuotas', [])) >= 2]
        
        if not multi_quota_results:
            print_info("No results with multiple matchedQuotas found (may be OK)")
            return True
        
        for i, r in enumerate(multi_quota_results[:3]):
            matched = r['matchedQuotas']
            best_quota = r['bestQuota']
            best_cutoff = r['bestCutoff']
            
            # Find the matched quota with largest cutoff
            max_matched = max(matched, key=lambda q: q['cutoff'])
            
            if best_quota != max_matched['code']:
                print_fail(f"Result {i}: bestQuota={best_quota}, but largest cutoff is {max_matched['code']}")
                return False
            
            if abs(best_cutoff - max_matched['cutoff']) > 0.01:
                print_fail(f"Result {i}: bestCutoff={best_cutoff}, but largest cutoff is {max_matched['cutoff']}")
                return False
            
            print_pass(f"Result {i}: bestQuota={best_quota} correctly has largest cutoff={best_cutoff}")
        
        return True
        
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_predict_high_rank_not_likely():
    """Test D: High rank should populate Not Likely bucket"""
    print_test("D. High rank (50000) should have Not Likely entries")
    
    payload = {
        "rank": 50000,
        "baseCategory": "GM",
        "course": "CS",
        "round": "R1"
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/predict", json=payload, timeout=30)
        if resp.status_code != 200:
            print_fail(f"Expected 200, got {resp.status_code}")
            return False
        
        data = resp.json()
        grouped = data.get('grouped', {})
        not_likely = grouped.get('Not Likely', [])
        
        if len(not_likely) == 0:
            print_fail("Not Likely bucket is empty for high rank")
            return False
        
        print_pass(f"Not Likely bucket has {len(not_likely)} entries")
        return True
        
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_predict_special_category_last():
    """Test E: Special category appended last"""
    print_test("E. Special category (PWD) should be last in eligibleCategories")
    
    payload = {
        "rank": 15000,
        "baseCategory": "GM",
        "special": ["PWD"],
        "course": "CS",
        "round": "R1"
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/predict", json=payload, timeout=30)
        if resp.status_code != 200:
            print_fail(f"Expected 200, got {resp.status_code}")
            return False
        
        data = resp.json()
        eligible = data.get('meta', {}).get('eligibleCategories', [])
        
        if not eligible:
            print_fail("eligibleCategories is empty")
            return False
        
        last = eligible[-1]
        if last['code'] != 'PWD':
            print_fail(f"Last eligible category is {last['code']}, expected PWD")
            return False
        
        print_pass(f"PWD correctly appended as last: {[c['code'] for c in eligible]}")
        return True
        
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_predict_legacy_payload():
    """Test F: Legacy payload still works"""
    print_test("F. Legacy payload {category:'2AG'} should work")
    
    payload = {
        "rank": 15000,
        "category": "2AG",
        "course": "CS",
        "round": "R1"
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/predict", json=payload, timeout=30)
        if resp.status_code != 200:
            print_fail(f"Expected 200, got {resp.status_code}")
            return False
        
        data = resp.json()
        
        # Check that it returns new shape
        if not data.get('ok'):
            print_fail("Response missing 'ok: true'")
            return False
        
        # Check meta.profile
        profile = data.get('meta', {}).get('profile', {})
        base_cat = profile.get('baseCategory')
        
        # Legacy '2AG' should translate to baseCategory='2A', rural=false, kannada=false
        if base_cat != '2A':
            print_fail(f"Expected baseCategory='2A', got '{base_cat}'")
            return False
        
        # Check eligibleCategories
        eligible = data.get('meta', {}).get('eligibleCategories', [])
        codes = [c['code'] for c in eligible]
        
        # Should have 2AG as first (or early) entry
        if '2AG' not in codes[:3]:
            print_fail(f"Expected '2AG' in first 3 eligible codes, got {codes[:3]}")
            return False
        
        print_pass(f"Legacy payload works. baseCategory={base_cat}, eligible={codes[:5]}")
        return True
        
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_predict_validation():
    """Test G: Validation - missing rank or round returns 400"""
    print_test("G. Validation: missing rank or round → 400")
    
    # Missing rank
    try:
        resp = requests.post(f"{BASE_URL}/predict", json={"round": "R1", "course": "CS"}, timeout=10)
        if resp.status_code != 400:
            print_fail(f"Missing rank: expected 400, got {resp.status_code}")
            return False
        print_pass("Missing rank correctly returns 400")
    except Exception as e:
        print_fail(f"Exception testing missing rank: {e}")
        return False
    
    # Missing round
    try:
        resp = requests.post(f"{BASE_URL}/predict", json={"rank": 10000, "course": "CS"}, timeout=10)
        if resp.status_code != 400:
            print_fail(f"Missing round: expected 400, got {resp.status_code}")
            return False
        print_pass("Missing round correctly returns 400")
    except Exception as e:
        print_fail(f"Exception testing missing round: {e}")
        return False
    
    return True

# ============================================================================
# TASK 2: /api/payment/create-order — Multi-Quota Payload
# ============================================================================

def test_create_order_new_payload():
    """Test create-order with new multi-quota payload"""
    print_test("Create-order: New multi-quota payload")
    
    payload = {
        "rank": 12000,
        "baseCategory": "2A",
        "rural": True,
        "kannada": False,
        "special": [],
        "course": "CS",
        "round": "R1"
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/payment/create-order", json=payload, timeout=10)
        print_info(f"Status: {resp.status_code}")
        
        if resp.status_code != 200:
            print_fail(f"Expected 200, got {resp.status_code}")
            print_info(f"Response: {resp.text[:500]}")
            return False
        
        data = resp.json()
        
        # Check required fields
        required = ['orderId', 'amount', 'currency', 'keyId', 'receipt']
        for field in required:
            if field not in data:
                print_fail(f"Missing field: {field}")
                return False
        
        # Verify values
        if data['amount'] != 5000:
            print_fail(f"Expected amount=5000, got {data['amount']}")
            return False
        
        if data['currency'] != 'INR':
            print_fail(f"Expected currency=INR, got {data['currency']}")
            return False
        
        print_pass(f"Order created: {data['orderId']}, amount={data['amount']}, currency={data['currency']}")
        return True
        
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_create_order_legacy_payload():
    """Test create-order with legacy payload"""
    print_test("Create-order: Legacy payload")
    
    payload = {
        "rank": 12000,
        "category": "GM",
        "course": "CS",
        "round": "R1"
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/payment/create-order", json=payload, timeout=10)
        if resp.status_code != 200:
            print_fail(f"Expected 200, got {resp.status_code}")
            return False
        
        data = resp.json()
        if 'orderId' not in data:
            print_fail("Missing orderId")
            return False
        
        print_pass(f"Legacy payload works: {data['orderId']}")
        return True
        
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_create_order_validation():
    """Test create-order validation"""
    print_test("Create-order: Validation (missing rank/round → 400)")
    
    # Missing rank
    try:
        resp = requests.post(f"{BASE_URL}/payment/create-order", json={"round": "R1"}, timeout=10)
        if resp.status_code != 400:
            print_fail(f"Missing rank: expected 400, got {resp.status_code}")
            return False
        print_pass("Missing rank correctly returns 400")
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False
    
    # Missing round
    try:
        resp = requests.post(f"{BASE_URL}/payment/create-order", json={"rank": 10000}, timeout=10)
        if resp.status_code != 400:
            print_fail(f"Missing round: expected 400, got {resp.status_code}")
            return False
        print_pass("Missing round correctly returns 400")
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False
    
    return True

# ============================================================================
# TASK 3: /api/payment/verify — Multi-Quota Engine + PDF
# ============================================================================

def compute_razorpay_signature(order_id, payment_id):
    """Compute HMAC-SHA256 signature for Razorpay"""
    message = f"{order_id}|{payment_id}"
    signature = hmac.new(
        RAZORPAY_KEY_SECRET.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    return signature

def test_verify_payment_new_payload():
    """Test verify payment with new multi-quota payload"""
    print_test("Verify payment: New multi-quota payload + PDF generation")
    
    # First create an order
    order_payload = {
        "rank": 12000,
        "baseCategory": "2A",
        "rural": True,
        "kannada": True,
        "special": ["PWD"],
        "course": "CS",
        "round": "R1"
    }
    
    try:
        order_resp = requests.post(f"{BASE_URL}/payment/create-order", json=order_payload, timeout=10)
        if order_resp.status_code != 200:
            print_fail(f"Order creation failed: {order_resp.status_code}")
            return False
        
        order_data = order_resp.json()
        order_id = order_data['orderId']
        print_info(f"Order created: {order_id}")
        
        # Simulate payment
        payment_id = f"pay_test_{int(time.time() * 1000)}"
        signature = compute_razorpay_signature(order_id, payment_id)
        
        verify_payload = {
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": signature,
            "input": order_payload
        }
        
        verify_resp = requests.post(f"{BASE_URL}/payment/verify", json=verify_payload, timeout=30)
        print_info(f"Verify status: {verify_resp.status_code}")
        
        if verify_resp.status_code != 200:
            print_fail(f"Expected 200, got {verify_resp.status_code}")
            print_info(f"Response: {verify_resp.text[:500]}")
            return False
        
        verify_data = verify_resp.json()
        
        # Check required fields
        if not verify_data.get('ok'):
            print_fail("Response missing 'ok: true'")
            return False
        
        pdf_url = verify_data.get('pdfUrl')
        if not pdf_url:
            print_fail("Missing pdfUrl")
            return False
        
        if not pdf_url.endswith('.pdf'):
            print_fail(f"pdfUrl doesn't end with .pdf: {pdf_url}")
            return False
        
        print_pass(f"PDF URL: {pdf_url}")
        
        # Verify PDF is downloadable
        pdf_resp = requests.get(pdf_url, timeout=10)
        if pdf_resp.status_code != 200:
            print_fail(f"PDF download failed: {pdf_resp.status_code}")
            return False
        
        pdf_content = pdf_resp.content
        
        # Check PDF signature
        if not pdf_content.startswith(b'%PDF'):
            print_fail("Downloaded file is not a valid PDF")
            return False
        
        pdf_size = len(pdf_content)
        if pdf_size < 30000:
            print_fail(f"PDF size {pdf_size} bytes is too small (expected ≥30KB)")
            return False
        
        print_pass(f"PDF downloaded successfully: {pdf_size} bytes")
        
        # Check reportId and paymentId
        report_id = verify_data.get('reportId')
        payment_id_resp = verify_data.get('paymentId')
        
        if not report_id:
            print_fail("Missing reportId")
            return False
        
        if payment_id_resp != payment_id:
            print_fail(f"paymentId mismatch: expected {payment_id}, got {payment_id_resp}")
            return False
        
        print_pass(f"reportId: {report_id}, paymentId: {payment_id_resp}")
        
        # Verify database entries (via admin endpoints)
        time.sleep(1)  # Give DB a moment
        
        # Check payments table
        payments_resp = requests.get(f"{BASE_URL}/admin/list?type=payments&limit=5", timeout=10)
        if payments_resp.status_code == 200:
            payments_data = payments_resp.json()
            payments = payments_data.get('rows', [])
            found_payment = any(p.get('payment_id') == payment_id and p.get('status') == 'captured' for p in payments)
            if found_payment:
                print_pass("Payment row inserted in database with status='captured'")
            else:
                print_fail("Payment row not found in database")
        
        # Check reports table
        reports_resp = requests.get(f"{BASE_URL}/admin/list?type=reports&limit=5", timeout=10)
        if reports_resp.status_code == 200:
            reports_data = reports_resp.json()
            reports = reports_data.get('rows', [])
            found_report = any(r.get('id') == report_id and r.get('rank') == 12000 for r in reports)
            if found_report:
                print_pass("Report row inserted in database")
            else:
                print_fail("Report row not found in database")
        
        return True
        
    except Exception as e:
        print_fail(f"Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_verify_payment_legacy_payload():
    """Test verify payment with legacy payload"""
    print_test("Verify payment: Legacy payload")
    
    order_payload = {
        "rank": 15000,
        "category": "GM",
        "course": "EC",
        "round": "R1"
    }
    
    try:
        order_resp = requests.post(f"{BASE_URL}/payment/create-order", json=order_payload, timeout=10)
        if order_resp.status_code != 200:
            print_fail(f"Order creation failed: {order_resp.status_code}")
            return False
        
        order_data = order_resp.json()
        order_id = order_data['orderId']
        
        payment_id = f"pay_test_legacy_{int(time.time() * 1000)}"
        signature = compute_razorpay_signature(order_id, payment_id)
        
        verify_payload = {
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": signature,
            "input": order_payload
        }
        
        verify_resp = requests.post(f"{BASE_URL}/payment/verify", json=verify_payload, timeout=30)
        
        if verify_resp.status_code != 200:
            print_fail(f"Expected 200, got {verify_resp.status_code}")
            return False
        
        verify_data = verify_resp.json()
        
        if not verify_data.get('ok'):
            print_fail("Response missing 'ok: true'")
            return False
        
        pdf_url = verify_data.get('pdfUrl')
        if not pdf_url or not pdf_url.endswith('.pdf'):
            print_fail("Invalid pdfUrl")
            return False
        
        print_pass(f"Legacy payload works. PDF: {pdf_url}")
        return True
        
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_verify_payment_forged_signature():
    """Test verify payment with forged signature"""
    print_test("Verify payment: Forged signature → 400")
    
    order_payload = {
        "rank": 10000,
        "baseCategory": "GM",
        "course": "CS",
        "round": "R1"
    }
    
    try:
        order_resp = requests.post(f"{BASE_URL}/payment/create-order", json=order_payload, timeout=10)
        if order_resp.status_code != 200:
            print_fail(f"Order creation failed: {order_resp.status_code}")
            return False
        
        order_data = order_resp.json()
        order_id = order_data['orderId']
        
        payment_id = f"pay_test_forged_{int(time.time() * 1000)}"
        # Use a forged signature
        forged_signature = "forged_signature_12345"
        
        verify_payload = {
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": forged_signature,
            "input": order_payload
        }
        
        verify_resp = requests.post(f"{BASE_URL}/payment/verify", json=verify_payload, timeout=10)
        
        if verify_resp.status_code != 400:
            print_fail(f"Expected 400, got {verify_resp.status_code}")
            return False
        
        print_pass("Forged signature correctly rejected with 400")
        return True
        
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

# ============================================================================
# Main Test Runner
# ============================================================================

def main():
    print("\n" + "="*80)
    print("KCET MULTI-QUOTA PREDICTION ENGINE - BACKEND TEST SUITE")
    print("="*80)
    
    results = {}
    
    # Task 1: /api/predict tests
    print("\n" + "="*80)
    print("TASK 1: /api/predict — Multi-Quota Engine")
    print("="*80)
    
    results['1A_multi_quota_expansion'] = test_predict_multi_quota_expansion()
    results['1B_confidence_math'] = test_predict_confidence_math()
    results['1C_best_quota_rule'] = test_predict_best_quota_rule()
    results['1D_high_rank_not_likely'] = test_predict_high_rank_not_likely()
    results['1E_special_category_last'] = test_predict_special_category_last()
    results['1F_legacy_payload'] = test_predict_legacy_payload()
    results['1G_validation'] = test_predict_validation()
    
    # Task 2: /api/payment/create-order tests
    print("\n" + "="*80)
    print("TASK 2: /api/payment/create-order — Multi-Quota Payload")
    print("="*80)
    
    results['2A_create_order_new'] = test_create_order_new_payload()
    results['2B_create_order_legacy'] = test_create_order_legacy_payload()
    results['2C_create_order_validation'] = test_create_order_validation()
    
    # Task 3: /api/payment/verify tests
    print("\n" + "="*80)
    print("TASK 3: /api/payment/verify — Multi-Quota Engine + PDF")
    print("="*80)
    
    results['3A_verify_new_payload'] = test_verify_payment_new_payload()
    results['3B_verify_legacy_payload'] = test_verify_payment_legacy_payload()
    results['3C_verify_forged_signature'] = test_verify_payment_forged_signature()
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print("\n" + "="*80)
    print(f"TOTAL: {passed}/{total} tests passed ({passed*100//total}%)")
    print("="*80)
    
    return passed == total

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
