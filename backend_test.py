#!/usr/bin/env python3
"""
KCET College Predictor 2026 - Backend API Test Suite
Tests Phase 2: Razorpay + PDF + Supabase Storage pipeline
"""

import os
import sys
import json
import time
import hmac
import hashlib
import requests
from datetime import datetime

# Load environment variables
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://kcet.preview.emergentagent.com')
RAZORPAY_KEY_SECRET = os.getenv('RAZORPAY_KEY_SECRET', 'EF8t4J0HipGamYuDKAntQAJt')

API_BASE = f"{BASE_URL}/api"

print(f"🧪 KCET Backend Test Suite")
print(f"📍 Base URL: {BASE_URL}")
print(f"🔑 Razorpay Secret: {RAZORPAY_KEY_SECRET[:8]}...")
print("=" * 80)

def test_health():
    """Test 1: GET /api/health"""
    print("\n✅ Test 1: GET /api/health")
    try:
        resp = requests.get(f"{API_BASE}/health", timeout=10)
        print(f"   Status: {resp.status_code}")
        data = resp.json()
        print(f"   Response: {json.dumps(data, indent=2)}")
        
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        assert data.get('ok') == True, "Expected ok=true"
        assert data.get('has_service_role') == True, "Expected has_service_role=true"
        assert data.get('has_razorpay') == True, "Expected has_razorpay=true"
        
        print("   ✅ PASSED: Health check successful")
        return True
    except Exception as e:
        print(f"   ❌ FAILED: {e}")
        return False

def test_lookup():
    """Test 2: GET /api/lookup"""
    print("\n✅ Test 2: GET /api/lookup")
    try:
        resp = requests.get(f"{API_BASE}/lookup", timeout=10)
        print(f"   Status: {resp.status_code}")
        data = resp.json()
        
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        assert 'courses' in data, "Expected courses array"
        assert 'categories' in data, "Expected categories array"
        assert 'rounds' in data, "Expected rounds array"
        
        courses = data['courses']
        categories = data['categories']
        rounds = data['rounds']
        
        print(f"   Courses count: {len(courses)}")
        print(f"   Categories: {categories}")
        print(f"   Rounds: {rounds}")
        
        assert len(courses) >= 12, f"Expected at least 12 courses, got {len(courses)}"
        assert 'GM' in categories, "Expected GM category"
        assert 'SCR' in categories, "Expected SCR category"
        assert 'STG' in categories, "Expected STG category"
        assert 'KK' in categories, "Expected KK category"
        assert 'R1' in rounds, "Expected R1 round"
        assert 'R2' in rounds, "Expected R2 round"
        
        print("   ✅ PASSED: Lookup endpoint working")
        return True
    except Exception as e:
        print(f"   ❌ FAILED: {e}")
        return False

def test_predict(rank, category, course, round_name):
    """Test 3: POST /api/predict"""
    print(f"\n✅ Test 3: POST /api/predict (rank={rank}, category={category}, course={course}, round={round_name})")
    try:
        payload = {
            "rank": rank,
            "category": category,
            "course": course,
            "round": round_name
        }
        resp = requests.post(f"{API_BASE}/predict", json=payload, timeout=15)
        print(f"   Status: {resp.status_code}")
        
        if resp.status_code != 200:
            print(f"   Response: {resp.text}")
            
        data = resp.json()
        
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        assert data.get('ok') == True, "Expected ok=true"
        assert 'counts' in data, "Expected counts object"
        assert 'sectionA' in data, "Expected sectionA array"
        assert 'sectionB' in data, "Expected sectionB array"
        
        counts = data['counts']
        sectionA = data['sectionA']
        sectionB = data['sectionB']
        
        print(f"   Section A count: {counts.get('sectionA', 0)}")
        print(f"   Section B count: {counts.get('sectionB', 0)}")
        
        assert counts.get('sectionA', 0) > 0, "Expected sectionA count > 0"
        assert counts.get('sectionB', 0) > 0, "Expected sectionB count > 0"
        
        # Check sectionA structure
        if len(sectionA) > 0:
            first = sectionA[0]
            assert 'chance' in first, "Expected chance field in sectionA"
            print(f"   First sectionA college: {first.get('college_name', 'N/A')} - {first.get('chance', 'N/A')}")
        
        # Check sectionB structure
        if len(sectionB) > 0:
            first = sectionB[0]
            assert 'courses' in first, "Expected courses array in sectionB"
            print(f"   First sectionB college: {first.get('college_name', 'N/A')} with {len(first.get('courses', []))} courses")
        
        # Check tier sorting (T1 should come before T2 in sectionA)
        tiers = [c.get('tier') for c in sectionA if c.get('tier')]
        if 'T1' in tiers and 'T2' in tiers:
            t1_idx = tiers.index('T1')
            t2_idx = tiers.index('T2')
            assert t1_idx < t2_idx, "Expected T1 colleges before T2 in sectionA"
            print(f"   ✅ Tier sorting correct: T1 before T2")
        
        print(f"   ✅ PASSED: Predict endpoint working for {category}")
        return True
    except Exception as e:
        print(f"   ❌ FAILED: {e}")
        return False

def test_create_order(rank, category, course, round_name):
    """Test 4: POST /api/payment/create-order"""
    print(f"\n✅ Test 4: POST /api/payment/create-order")
    try:
        payload = {
            "rank": rank,
            "category": category,
            "course": course,
            "round": round_name
        }
        resp = requests.post(f"{API_BASE}/payment/create-order", json=payload, timeout=10)
        print(f"   Status: {resp.status_code}")
        
        if resp.status_code != 200:
            print(f"   Response: {resp.text}")
            
        data = resp.json()
        
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        assert 'orderId' in data, "Expected orderId"
        assert 'amount' in data, "Expected amount"
        assert 'currency' in data, "Expected currency"
        assert 'keyId' in data, "Expected keyId"
        assert 'receipt' in data, "Expected receipt"
        
        order_id = data['orderId']
        amount = data['amount']
        currency = data['currency']
        key_id = data['keyId']
        
        print(f"   Order ID: {order_id}")
        print(f"   Amount: {amount}")
        print(f"   Currency: {currency}")
        print(f"   Key ID: {key_id}")
        
        assert order_id.startswith('order_'), f"Expected orderId to start with 'order_', got {order_id}"
        assert amount == 5000, f"Expected amount=5000, got {amount}"
        assert currency == 'INR', f"Expected currency=INR, got {currency}"
        assert key_id.startswith('rzp_test_'), f"Expected keyId to start with 'rzp_test_', got {key_id}"
        
        print("   ✅ PASSED: Order creation successful")
        return order_id
    except Exception as e:
        print(f"   ❌ FAILED: {e}")
        return None

def test_verify_forged_signature(order_id):
    """Test 5: POST /api/payment/verify with forged signature"""
    print(f"\n✅ Test 5: POST /api/payment/verify with FORGED signature")
    try:
        payload = {
            "razorpay_order_id": order_id,
            "razorpay_payment_id": "pay_forged_test",
            "razorpay_signature": "deadbeef",
            "input": {
                "rank": 12000,
                "category": "GM",
                "course": "CS",
                "round": "R1"
            }
        }
        resp = requests.post(f"{API_BASE}/payment/verify", json=payload, timeout=10)
        print(f"   Status: {resp.status_code}")
        
        data = resp.json()
        print(f"   Response: {json.dumps(data, indent=2)}")
        
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
        assert 'error' in data, "Expected error field"
        assert 'Signature verification failed' in data['error'], f"Expected signature verification error, got {data['error']}"
        
        print("   ✅ PASSED: Forged signature correctly rejected")
        return True
    except Exception as e:
        print(f"   ❌ FAILED: {e}")
        return False

def compute_razorpay_signature(order_id, payment_id, secret):
    """Compute HMAC-SHA256 signature for Razorpay"""
    message = f"{order_id}|{payment_id}"
    signature = hmac.new(
        secret.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    return signature

def test_verify_real_signature(rank, category, course, round_name):
    """Test 6: End-to-end happy path with REAL HMAC"""
    print(f"\n✅ Test 6: End-to-end happy path with REAL HMAC (rank={rank}, category={category}, course={course}, round={round_name})")
    try:
        # Step 1: Create order
        print("   Step 1: Creating order...")
        payload = {
            "rank": rank,
            "category": category,
            "course": course,
            "round": round_name
        }
        resp = requests.post(f"{API_BASE}/payment/create-order", json=payload, timeout=10)
        assert resp.status_code == 200, f"Order creation failed: {resp.status_code}"
        order_data = resp.json()
        order_id = order_data['orderId']
        print(f"   Order created: {order_id}")
        
        # Step 2: Generate synthetic payment_id
        payment_id = f"pay_simulated_{int(time.time() * 1000)}"
        print(f"   Synthetic payment ID: {payment_id}")
        
        # Step 3: Compute signature
        signature = compute_razorpay_signature(order_id, payment_id, RAZORPAY_KEY_SECRET)
        print(f"   Computed signature: {signature[:16]}...")
        
        # Step 4: Verify payment
        print("   Step 2: Verifying payment with real signature...")
        verify_payload = {
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": signature,
            "input": {
                "rank": rank,
                "category": category,
                "course": course,
                "round": round_name
            }
        }
        resp = requests.post(f"{API_BASE}/payment/verify", json=verify_payload, timeout=30)
        print(f"   Status: {resp.status_code}")
        
        if resp.status_code != 200:
            print(f"   Response: {resp.text}")
            
        data = resp.json()
        
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        assert data.get('ok') == True, "Expected ok=true"
        assert 'pdfUrl' in data, "Expected pdfUrl"
        assert 'reportId' in data, "Expected reportId"
        assert 'paymentId' in data, "Expected paymentId"
        
        pdf_url = data['pdfUrl']
        report_id = data['reportId']
        payment_id_returned = data['paymentId']
        
        print(f"   PDF URL: {pdf_url}")
        print(f"   Report ID: {report_id}")
        print(f"   Payment ID: {payment_id_returned}")
        
        assert pdf_url.endswith('.pdf'), f"Expected PDF URL to end with .pdf, got {pdf_url}"
        assert report_id is not None, "Expected reportId to be non-null"
        assert payment_id_returned == payment_id, f"Expected paymentId={payment_id}, got {payment_id_returned}"
        
        # Step 5: Verify PDF is accessible
        print("   Step 3: Verifying PDF is accessible...")
        pdf_resp = requests.head(pdf_url, timeout=10)
        print(f"   PDF HEAD status: {pdf_resp.status_code}")
        print(f"   PDF Content-Type: {pdf_resp.headers.get('Content-Type', 'N/A')}")
        print(f"   PDF Content-Length: {pdf_resp.headers.get('Content-Length', 'N/A')}")
        
        assert pdf_resp.status_code == 200, f"Expected PDF to be accessible, got {pdf_resp.status_code}"
        assert 'pdf' in pdf_resp.headers.get('Content-Type', '').lower(), "Expected Content-Type to contain 'pdf'"
        
        content_length = int(pdf_resp.headers.get('Content-Length', 0))
        assert content_length > 5000, f"Expected PDF size > 5KB, got {content_length} bytes"
        
        print(f"   ✅ PASSED: End-to-end payment flow successful")
        return {
            'order_id': order_id,
            'payment_id': payment_id,
            'pdf_url': pdf_url,
            'report_id': report_id
        }
    except Exception as e:
        print(f"   ❌ FAILED: {e}")
        return None

def test_admin_list_reports():
    """Test 7a: GET /api/admin/list?type=reports"""
    print(f"\n✅ Test 7a: GET /api/admin/list?type=reports")
    try:
        resp = requests.get(f"{API_BASE}/admin/list?type=reports&limit=10", timeout=10)
        print(f"   Status: {resp.status_code}")
        
        data = resp.json()
        
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        assert 'rows' in data, "Expected rows array"
        
        rows = data['rows']
        print(f"   Reports count: {len(rows)}")
        
        if len(rows) > 0:
            first = rows[0]
            print(f"   First report: rank={first.get('rank')}, category={first.get('category')}, course={first.get('course_code')}")
            print(f"   PDF URL: {first.get('pdf_url', 'N/A')[:80]}...")
            print(f"   Created at: {first.get('created_at', 'N/A')}")
            
            assert 'rank' in first, "Expected rank field"
            assert 'category' in first, "Expected category field"
            assert 'pdf_url' in first, "Expected pdf_url field"
            assert 'created_at' in first, "Expected created_at field"
        
        print("   ✅ PASSED: Reports list retrieved")
        return True
    except Exception as e:
        print(f"   ❌ FAILED: {e}")
        return False

def test_admin_list_payments():
    """Test 7b: GET /api/admin/list?type=payments"""
    print(f"\n✅ Test 7b: GET /api/admin/list?type=payments")
    try:
        resp = requests.get(f"{API_BASE}/admin/list?type=payments&limit=10", timeout=10)
        print(f"   Status: {resp.status_code}")
        
        data = resp.json()
        
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        assert 'rows' in data, "Expected rows array"
        
        rows = data['rows']
        print(f"   Payments count: {len(rows)}")
        
        if len(rows) > 0:
            first = rows[0]
            print(f"   First payment: payment_id={first.get('payment_id')}, amount={first.get('amount')}, status={first.get('status')}")
            print(f"   Created at: {first.get('created_at', 'N/A')}")
            
            assert 'payment_id' in first, "Expected payment_id field"
            assert 'amount' in first, "Expected amount field"
            assert 'status' in first, "Expected status field"
            assert 'created_at' in first, "Expected created_at field"
        
        print("   ✅ PASSED: Payments list retrieved")
        return True
    except Exception as e:
        print(f"   ❌ FAILED: {e}")
        return False

def test_admin_revenue():
    """Test 7c: GET /api/admin/revenue"""
    print(f"\n✅ Test 7c: GET /api/admin/revenue")
    try:
        resp = requests.get(f"{API_BASE}/admin/revenue", timeout=10)
        print(f"   Status: {resp.status_code}")
        
        data = resp.json()
        
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        assert 'total_revenue' in data, "Expected total_revenue field"
        assert 'total_captured' in data, "Expected total_captured field"
        assert 'recent' in data, "Expected recent array"
        
        total_revenue = data['total_revenue']
        total_captured = data['total_captured']
        
        print(f"   Total revenue: ₹{total_revenue}")
        print(f"   Total captured: {total_captured}")
        print(f"   Recent payments: {len(data.get('recent', []))}")
        
        assert total_revenue >= 0, "Expected total_revenue >= 0"
        assert total_captured >= 0, "Expected total_captured >= 0"
        
        print("   ✅ PASSED: Revenue data retrieved")
        return True
    except Exception as e:
        print(f"   ❌ FAILED: {e}")
        return False

def test_admin_stats():
    """Test 7d: GET /api/admin/stats"""
    print(f"\n✅ Test 7d: GET /api/admin/stats")
    try:
        resp = requests.get(f"{API_BASE}/admin/stats", timeout=10)
        print(f"   Status: {resp.status_code}")
        
        data = resp.json()
        
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        assert 'colleges' in data, "Expected colleges count"
        assert 'courses' in data, "Expected courses count"
        assert 'cutoffs' in data, "Expected cutoffs count"
        assert 'payments' in data, "Expected payments count"
        assert 'reports' in data, "Expected reports count"
        assert 'revenue' in data, "Expected revenue field"
        
        print(f"   Colleges: {data['colleges']}")
        print(f"   Courses: {data['courses']}")
        print(f"   Cutoffs: {data['cutoffs']}")
        print(f"   Payments: {data['payments']}")
        print(f"   Reports: {data['reports']}")
        print(f"   Revenue: ₹{data['revenue']}")
        
        assert data['colleges'] >= 15, f"Expected at least 15 colleges, got {data['colleges']}"
        assert data['courses'] >= 15, f"Expected at least 15 courses, got {data['courses']}"
        assert data['cutoffs'] >= 19000, f"Expected at least 19000 cutoffs, got {data['cutoffs']}"
        
        print("   ✅ PASSED: Stats retrieved")
        return True
    except Exception as e:
        print(f"   ❌ FAILED: {e}")
        return False

def test_edge_case_missing_rank():
    """Test 9a: POST /api/payment/create-order missing rank"""
    print(f"\n✅ Test 9a: POST /api/payment/create-order missing rank")
    try:
        payload = {
            "category": "GM",
            "course": "CS",
            "round": "R1"
        }
        resp = requests.post(f"{API_BASE}/payment/create-order", json=payload, timeout=10)
        print(f"   Status: {resp.status_code}")
        
        data = resp.json()
        
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
        assert 'error' in data, "Expected error field"
        
        print(f"   Error: {data['error']}")
        print("   ✅ PASSED: Missing rank correctly rejected")
        return True
    except Exception as e:
        print(f"   ❌ FAILED: {e}")
        return False

def test_edge_case_invalid_signature():
    """Test 9b: POST /api/payment/verify with flipped signature"""
    print(f"\n✅ Test 9b: POST /api/payment/verify with flipped signature")
    try:
        # Create a valid order first
        payload = {
            "rank": 12000,
            "category": "GM",
            "course": "CS",
            "round": "R1"
        }
        resp = requests.post(f"{API_BASE}/payment/create-order", json=payload, timeout=10)
        order_data = resp.json()
        order_id = order_data['orderId']
        
        payment_id = f"pay_test_{int(time.time() * 1000)}"
        signature = compute_razorpay_signature(order_id, payment_id, RAZORPAY_KEY_SECRET)
        
        # Flip one character in signature
        flipped_signature = signature[:-1] + ('0' if signature[-1] != '0' else '1')
        
        verify_payload = {
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": flipped_signature,
            "input": {
                "rank": 12000,
                "category": "GM",
                "course": "CS",
                "round": "R1"
            }
        }
        resp = requests.post(f"{API_BASE}/payment/verify", json=verify_payload, timeout=10)
        print(f"   Status: {resp.status_code}")
        
        data = resp.json()
        
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
        assert 'error' in data, "Expected error field"
        assert 'Signature verification failed' in data['error'], f"Expected signature verification error"
        
        print("   ✅ PASSED: Invalid signature correctly rejected")
        return True
    except Exception as e:
        print(f"   ❌ FAILED: {e}")
        return False

def test_record_failure():
    """Test 9c: POST /api/payment/record-failure"""
    print(f"\n✅ Test 9c: POST /api/payment/record-failure")
    try:
        payload = {
            "razorpay_payment_id": f"pay_failed_{int(time.time() * 1000)}",
            "description": "User cancelled"
        }
        resp = requests.post(f"{API_BASE}/payment/record-failure", json=payload, timeout=10)
        print(f"   Status: {resp.status_code}")
        
        data = resp.json()
        
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        assert data.get('ok') == True, "Expected ok=true"
        
        print("   ✅ PASSED: Failure recorded")
        
        # Verify it appears in payments list
        resp = requests.get(f"{API_BASE}/admin/list?type=payments&limit=10", timeout=10)
        data = resp.json()
        rows = data.get('rows', [])
        
        failed_payments = [r for r in rows if r.get('status') == 'failed']
        print(f"   Failed payments in list: {len(failed_payments)}")
        
        assert len(failed_payments) > 0, "Expected at least one failed payment"
        
        print("   ✅ PASSED: Failed payment appears in list")
        return True
    except Exception as e:
        print(f"   ❌ FAILED: {e}")
        return False

def main():
    """Run all tests"""
    results = []
    
    # Test 1: Health check
    results.append(("Health check", test_health()))
    
    # Test 2: Lookup
    results.append(("Lookup", test_lookup()))
    
    # Test 3: Predict for all categories
    for category in ['GM', 'SCR', 'KK', 'STG']:
        results.append((f"Predict {category}", test_predict(12000, category, 'CS', 'R1')))
    
    # Test 4: Create order
    order_id = test_create_order(12000, 'GM', 'CS', 'R1')
    results.append(("Create order", order_id is not None))
    
    # Test 5: Verify with forged signature
    if order_id:
        results.append(("Verify forged signature", test_verify_forged_signature(order_id)))
    
    # Test 6: End-to-end happy path with real signature (GM)
    gm_result = test_verify_real_signature(12000, 'GM', 'CS', 'R1')
    results.append(("E2E happy path GM", gm_result is not None))
    
    # Test 7: Admin endpoints
    results.append(("Admin list reports", test_admin_list_reports()))
    results.append(("Admin list payments", test_admin_list_payments()))
    results.append(("Admin revenue", test_admin_revenue()))
    results.append(("Admin stats", test_admin_stats()))
    
    # Test 8: Additional verify-flow test with SCR
    scr_result = test_verify_real_signature(50000, 'SCR', 'AI', 'R2')
    results.append(("E2E happy path SCR", scr_result is not None))
    
    # Test 9: Edge cases
    results.append(("Edge case: missing rank", test_edge_case_missing_rank()))
    results.append(("Edge case: invalid signature", test_edge_case_invalid_signature()))
    results.append(("Edge case: record failure", test_record_failure()))
    
    # Summary
    print("\n" + "=" * 80)
    print("📊 TEST SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    print("=" * 80)
    print(f"Total: {passed}/{total} tests passed ({passed*100//total}%)")
    print("=" * 80)
    
    return passed == total

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
