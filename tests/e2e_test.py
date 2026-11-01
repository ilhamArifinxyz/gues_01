"""
=============================================================================
E2E INTEGRATION & EDGE-CASE TEST SUITE
Sistem Manajemen Absensi Berbasis Web - Kelompok 10 RPL (Tadulako 2026)
QA & Test Automation Specialist
=============================================================================
"""

import sys
import os
import time
import json
import csv
import io
import uuid
import subprocess
import urllib.request
import urllib.error

BASE_URL = os.environ.get("BASE_URL", "http://localhost:8080")
API_URL = f"{BASE_URL}/api/v1"

# ANSI Colors for Terminal Output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"

test_results = []

def record_result(tc_id, tc_name, status, details=""):
    test_results.append({
        "id": tc_id,
        "name": tc_name,
        "status": status,
        "details": details
    })
    status_colored = f"{GREEN}[PASS]{RESET}" if status == "PASS" else f"{RED}[FAIL]{RESET}"
    print(f"{status_colored} {BOLD}{tc_id}{RESET}: {tc_name}")
    if details:
        print(f"       -> {details}")

def encode_multipart_formdata(fields, files):
    boundary = uuid.uuid4().hex
    crlf = b"\r\n"
    lines = []
    for k, v in fields.items():
        lines.append(f"--{boundary}".encode("utf-8"))
        lines.append(f'Content-Disposition: form-data; name="{k}"'.encode("utf-8"))
        lines.append(b"")
        lines.append(str(v).encode("utf-8"))
    for k, filename, content_type, file_bytes in files:
        lines.append(f"--{boundary}".encode("utf-8"))
        lines.append(f'Content-Disposition: form-data; name="{k}"; filename="{filename}"'.encode("utf-8"))
        lines.append(f'Content-Type: {content_type}'.encode("utf-8"))
        lines.append(b"")
        lines.append(file_bytes)
    lines.append(f"--{boundary}--".encode("utf-8"))
    lines.append(b"")
    body = crlf.join(lines)
    content_type_header = f"multipart/form-data; boundary={boundary}"
    return content_type_header, body

def api_request(method, endpoint, headers=None, data=None, is_json=True):
    url = f"{API_URL}{endpoint}" if not endpoint.startswith("http") else endpoint
    req_headers = headers.copy() if headers else {}
    req_data = None

    if data is not None:
        if is_json and isinstance(data, (dict, list)):
            req_data = json.dumps(data).encode("utf-8")
            req_headers["Content-Type"] = "application/json"
        elif isinstance(data, bytes):
            req_data = data
        else:
            req_data = str(data).encode("utf-8")

    req = urllib.request.Request(url, data=req_data, headers=req_headers, method=method)

    try:
        with urllib.request.urlopen(req) as response:
            status_code = response.getcode()
            resp_headers = dict(response.info())
            resp_bytes = response.read()
            return status_code, resp_headers, resp_bytes
    except urllib.error.HTTPError as e:
        resp_headers = dict(e.headers)
        resp_bytes = e.read()
        return e.code, resp_headers, resp_bytes
    except Exception as e:
        return 0, {}, str(e).encode("utf-8")

def parse_json_safely(resp_bytes):
    try:
        return json.loads(resp_bytes.decode("utf-8"))
    except Exception:
        return {}

def check_or_start_server():
    print(f"{CYAN}Memeriksa ketersediaan server di {BASE_URL}/health...{RESET}")
    code, _, _ = api_request("GET", f"{BASE_URL}/health")
    if code == 200:
        print(f"{GREEN}Server backend sudah aktif dan siap.{RESET}\n")
        return None

    print(f"{YELLOW}Server belum aktif. Menjalankan server Go backend lokal...{RESET}")
    backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend")
    proc = subprocess.Popen(["go", "run", "./cmd/api"], cwd=backend_dir)
    
    # Tunggu sampai server merespons
    for _ in range(30):
        time.sleep(1)
        code, _, _ = api_request("GET", f"{BASE_URL}/health")
        if code == 200:
            print(f"{GREEN}Server backend Go berhasil dinyalakan (PID {proc.pid}).{RESET}\n")
            return proc
            
    print(f"{RED}Gagal menyalakan server backend Go dalam 30 detik.{RESET}")
    proc.terminate()
    sys.exit(1)

def run_tests():
    server_proc = check_or_start_server()
    print(f"{BOLD}==================================================================={RESET}")
    print(f"{BOLD}  EKSEKUSI PENGUJIAN INTEGRASI & VALIDASI EDGE CASE (QA-01)       {RESET}")
    print(f"{BOLD}===================================================================\n{RESET}")

    admin_token = None
    karyawan_token = None
    created_leave_id = None

    try:
        # -------------------------------------------------------------
        # TC-01: Autentikasi Admin & Karyawan
        # -------------------------------------------------------------
        print(f"{CYAN}[TC-01] Menguji Endpoint Autentikasi (POST /api/v1/auth/login)...{RESET}")
        
        # 1. Admin Login
        admin_body = {"identifier": "admin@absensi.com", "password": "admin123"}
        code, _, resp = api_request("POST", "/auth/login", data=admin_body)
        body = parse_json_safely(resp)
        if code == 200 and body.get("success") and "token" in body.get("data", {}):
            admin_token = body["data"]["token"]
            role = body["data"]["user"]["role"]
            if role == "ADMIN":
                record_result("TC-01A", "Login Admin (admin@absensi.com)", "PASS", f"HTTP {code}, Token terbit, Role: {role}")
            else:
                record_result("TC-01A", "Login Admin (admin@absensi.com)", "FAIL", f"Role salah: {role}")
        else:
            record_result("TC-01A", "Login Admin (admin@absensi.com)", "FAIL", f"HTTP {code}, Resp: {resp.decode('utf-8', errors='ignore')}")

        # 2. Karyawan Login (Ilham Arifin)
        karyawan_body = {"identifier": "ilham@absensi.com", "password": "karyawan123"}
        code, _, resp = api_request("POST", "/auth/login", data=karyawan_body)
        body = parse_json_safely(resp)
        if code == 200 and body.get("success") and "token" in body.get("data", {}):
            karyawan_token = body["data"]["token"]
            role = body["data"]["user"]["role"]
            nik = body["data"]["user"]["nik"]
            if role == "KARYAWAN" and nik == "F5512530109":
                record_result("TC-01B", "Login Karyawan (ilham@absensi.com)", "PASS", f"HTTP {code}, Token terbit, NIK: {nik}, Role: {role}")
            else:
                record_result("TC-01B", "Login Karyawan (ilham@absensi.com)", "FAIL", f"Payload data pengguna tidak cocok: {body}")
        else:
            record_result("TC-01B", "Login Karyawan (ilham@absensi.com)", "FAIL", f"HTTP {code}, Resp: {resp.decode('utf-8', errors='ignore')}")

        # 3. Verifikasi Token Me Endpoint
        if karyawan_token:
            code, _, resp = api_request("GET", "/auth/me", headers={"Authorization": f"Bearer {karyawan_token}"})
            body = parse_json_safely(resp)
            if code == 200 and body.get("data", {}).get("email") == "ilham@absensi.com":
                record_result("TC-01C", "Verifikasi JWT Profil Karyawan (/auth/me)", "PASS", f"Profil diverifikasi untuk {body['data']['nama_lengkap']}")
            else:
                record_result("TC-01C", "Verifikasi JWT Profil Karyawan (/auth/me)", "FAIL", f"HTTP {code}")

        # -------------------------------------------------------------
        # TC-03: Edge Case Geofence: Presensi Di Luar Radius Kantor
        # Dilakukan sebelum TC-02 agar slot presensi belum terisi
        # -------------------------------------------------------------
        print(f"\n{CYAN}[TC-03] Menguji Edge Case Geofence Di Luar Radius Kantor...{RESET}")
        dummy_jpeg = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00fake_image_bytes"
        out_fields = {
            "jenis": "MASUK",
            "latitude": "-6.2088000",   # Jakarta (Jarak ~1.600 km dari Palu)
            "longitude": "106.8456000"
        }
        out_files = [("foto", "swafoto_diluar.jpg", "image/jpeg", dummy_jpeg)]
        ctype, body_bytes = encode_multipart_formdata(out_fields, out_files)

        code, _, resp = api_request(
            "POST",
            "/attendance/punch",
            headers={"Authorization": f"Bearer {karyawan_token}", "Content-Type": ctype},
            data=body_bytes,
            is_json=False
        )
        body = parse_json_safely(resp)
        if code == 422 and body.get("error_code") == "OUT_OF_GEOFENCE":
            record_result("TC-03", "Edge Case Geofence (Presensi di Luar Radius)", "PASS", 
                          f"HTTP 422 OUT_OF_GEOFENCE diterima. Pesan: '{body.get('message')}'")
        else:
            record_result("TC-03", "Edge Case Geofence (Presensi di Luar Radius)", "FAIL", 
                          f"Ekspektasi HTTP 422, didapat HTTP {code}. Body: {resp.decode('utf-8', errors='ignore')}")

        # -------------------------------------------------------------
        # TC-02: Presensi Dalam Radius Kantor (Palu: Lat -0.8917000, Lng 119.8872000)
        # -------------------------------------------------------------
        print(f"\n{CYAN}[TC-02] Menguji Presensi Masuk Valid Dalam Radius Kantor...{RESET}")
        in_fields = {
            "jenis": "MASUK",
            "latitude": "-0.8917100",   # ~1.1 meter dari titik koordinat kantor Palu (-0.8917000, 119.8872000)
            "longitude": "119.8872050"
        }
        in_files = [("foto", "swafoto_masuk_kantor.jpg", "image/jpeg", dummy_jpeg)]
        ctype, body_bytes = encode_multipart_formdata(in_fields, in_files)

        code, _, resp = api_request(
            "POST",
            "/attendance/punch",
            headers={"Authorization": f"Bearer {karyawan_token}", "Content-Type": ctype},
            data=body_bytes,
            is_json=False
        )
        body = parse_json_safely(resp)
        if code == 201 and body.get("success"):
            data = body.get("data", {})
            jarak = data.get("jarak_meter", 999)
            jenis_presensi = data.get("jenis_presensi")
            status_kehadiran = data.get("status_kehadiran")
            if jarak <= 50.0 and jenis_presensi == "MASUK":
                record_result("TC-02", "Presensi Valid Dalam Radius Kantor (Palu)", "PASS", 
                              f"HTTP 201 Created. ID: {data.get('id_presensi')}, Jarak: {jarak}m (<=50m), Status: {status_kehadiran}")
            else:
                record_result("TC-02", "Presensi Valid Dalam Radius Kantor (Palu)", "FAIL", 
                              f"Jarak ({jarak}m) atau jenis ({jenis_presensi}) tidak memenuhi kriteria")
        else:
            record_result("TC-02", "Presensi Valid Dalam Radius Kantor (Palu)", "FAIL", 
                          f"HTTP {code}. Body: {resp.decode('utf-8', errors='ignore')}")

        # -------------------------------------------------------------
        # TC-04: Edge Case Presensi Ganda (Mencoba presensi MASUK kedua kali di hari yang sama)
        # -------------------------------------------------------------
        print(f"\n{CYAN}[TC-04] Menguji Edge Case Presensi Masuk Ganda...{RESET}")
        code, _, resp = api_request(
            "POST",
            "/attendance/punch",
            headers={"Authorization": f"Bearer {karyawan_token}", "Content-Type": ctype},
            data=body_bytes,
            is_json=False
        )
        body = parse_json_safely(resp)
        if code == 400 and body.get("error_code") == "ALREADY_CHECKED_IN":
            record_result("TC-04", "Edge Case Presensi Ganda (ALREADY_CHECKED_IN)", "PASS", 
                          f"HTTP 400 ALREADY_CHECKED_IN. Pesan: '{body.get('message')}'")
        else:
            record_result("TC-04", "Edge Case Presensi Ganda (ALREADY_CHECKED_IN)", "FAIL", 
                          f"Ekspektasi HTTP 400 ALREADY_CHECKED_IN, didapat HTTP {code}. Body: {resp.decode('utf-8', errors='ignore')}")

        # -------------------------------------------------------------
        # TC-07: Presensi Pulang (Clock-Out) & Kalkulasi Durasi Kerja
        # -------------------------------------------------------------
        print(f"\n{CYAN}[TC-07] Menguji Presensi Pulang (Clock-Out) & Durasi Kerja...{RESET}")
        out_punch_fields = {
            "jenis": "PULANG",
            "latitude": "-0.8917100",
            "longitude": "119.8872050"
        }
        out_punch_files = [("foto", "swafoto_pulang_kantor.jpg", "image/jpeg", dummy_jpeg)]
        ctype_out, body_bytes_out = encode_multipart_formdata(out_punch_fields, out_punch_files)

        code, _, resp = api_request(
            "POST",
            "/attendance/punch",
            headers={"Authorization": f"Bearer {karyawan_token}", "Content-Type": ctype_out},
            data=body_bytes_out,
            is_json=False
        )
        body = parse_json_safely(resp)
        if code == 201 and body.get("success"):
            data = body.get("data", {})
            st_pulang = data.get("status_kehadiran")
            record_result("TC-07A", "Presensi Pulang Valid (PULANG)", "PASS",
                          f"HTTP 201 Created. ID: {data.get('id_presensi')}, Status: {st_pulang}")
        else:
            record_result("TC-07A", "Presensi Pulang Valid (PULANG)", "FAIL",
                          f"HTTP {code}. Body: {resp.decode('utf-8', errors='ignore')}")

        # Verifikasi GET /attendance/today mencakup durasi kerja
        code, _, resp = api_request(
            "GET",
            "/attendance/today",
            headers={"Authorization": f"Bearer {karyawan_token}"}
        )
        body = parse_json_safely(resp)
        if code == 200 and body.get("data", {}).get("sudah_masuk") and body.get("data", {}).get("sudah_pulang"):
            data = body.get("data", {})
            durasi = data.get("total_jam_kerja", "")
            if durasi and "Jam" in durasi and "Menit" in durasi:
                record_result("TC-07B", "Kalkulasi Otomatis Total Durasi Jam Kerja (/attendance/today)", "PASS",
                              f"Sudah Masuk & Pulang: True, Total Jam Kerja: '{durasi}', Durasi Menit: {data.get('durasi_menit')}m")
            else:
                record_result("TC-07B", "Kalkulasi Otomatis Total Durasi Jam Kerja (/attendance/today)", "FAIL",
                              f"Format durasi tidak sesuai: '{durasi}'")
        else:
            record_result("TC-07B", "Kalkulasi Otomatis Total Durasi Jam Kerja (/attendance/today)", "FAIL",
                          f"HTTP {code}. Body: {resp.decode('utf-8', errors='ignore')}")

        # Edge case: Presensi pulang ganda
        code, _, resp = api_request(
            "POST",
            "/attendance/punch",
            headers={"Authorization": f"Bearer {karyawan_token}", "Content-Type": ctype_out},
            data=body_bytes_out,
            is_json=False
        )
        body = parse_json_safely(resp)
        if code == 400 and body.get("error_code") == "ALREADY_CHECKED_OUT":
            record_result("TC-07C", "Edge Case Presensi Pulang Ganda (ALREADY_CHECKED_OUT)", "PASS",
                          f"HTTP 400 ALREADY_CHECKED_OUT. Pesan: '{body.get('message')}'")
        else:
            record_result("TC-07C", "Edge Case Presensi Pulang Ganda (ALREADY_CHECKED_OUT)", "FAIL",
                          f"Ekspektasi HTTP 400 ALREADY_CHECKED_OUT, dapat HTTP {code}. Body: {resp.decode('utf-8', errors='ignore')}")

        # -------------------------------------------------------------
        # TC-05: Alur Pengajuan Izin & Persetujuan Admin
        # -------------------------------------------------------------
        print(f"\n{CYAN}[TC-05] Menguji Alur Pengajuan Izin dan Persetujuan Admin...{RESET}")
        
        # 1. Karyawan mengajukan izin (POST /leaves)
        dummy_pdf = b"%PDF-1.4 fake pdf content for surat izin"
        leave_fields = {
            "jenis_izin": "IZIN",
            "tanggal_mulai": "2026-11-05",
            "tanggal_selesai": "2026-11-06",
            "alasan": "Keperluan keluarga mendesak di Palu Barat"
        }
        leave_files = [("bukti", "surat_keterangan_keluarga.pdf", "application/pdf", dummy_pdf)]
        ctype, body_bytes = encode_multipart_formdata(leave_fields, leave_files)

        code, _, resp = api_request(
            "POST",
            "/leaves",
            headers={"Authorization": f"Bearer {karyawan_token}", "Content-Type": ctype},
            data=body_bytes,
            is_json=False
        )
        body = parse_json_safely(resp)
        if code == 201 and body.get("success") and "id_izin" in body.get("data", {}):
            created_leave_id = body["data"]["id_izin"]
            record_result("TC-05A", "Pengajuan Izin Karyawan (POST /leaves)", "PASS", 
                          f"HTTP 201 Created. ID Izin: {created_leave_id}, Status: {body['data']['status']}")
        else:
            record_result("TC-05A", "Pengajuan Izin Karyawan (POST /leaves)", "FAIL", 
                          f"HTTP {code}. Resp: {resp.decode('utf-8', errors='ignore')}")

        # 2. Admin Review & Approve Izin (PATCH /admin/leaves/:id/review)
        if created_leave_id and admin_token:
            review_body = {
                "status": "DISETUJUI",
                "catatan_admin": "Disetujui oleh HR Manager. Harap serah terima tugas sebelum cuti."
            }
            code, _, resp = api_request(
                "PATCH",
                f"/admin/leaves/{created_leave_id}/review",
                headers={"Authorization": f"Bearer {admin_token}"},
                data=review_body
            )
            body = parse_json_safely(resp)
            if code == 200 and body.get("success") and body.get("data", {}).get("status") == "DISETUJUI":
                data = body["data"]
                record_result("TC-05B", "Persetujuan Izin oleh Admin (PATCH /admin/leaves/:id/review)", "PASS", 
                              f"HTTP 200 OK. Status: {data.get('status')}, Diverifikasi oleh: {data.get('diverifikasi_oleh')}")
            else:
                record_result("TC-05B", "Persetujuan Izin oleh Admin (PATCH /admin/leaves/:id/review)", "FAIL", 
                              f"HTTP {code}. Resp: {resp.decode('utf-8', errors='ignore')}")
        else:
            record_result("TC-05B", "Persetujuan Izin oleh Admin", "FAIL", "Tidak dapat diuji karena token admin atau id_izin kosong")

        # -------------------------------------------------------------
        # TC-06: Verifikasi Ekspor CSV Presensi & Integritas Kolom Data
        # -------------------------------------------------------------
        print(f"\n{CYAN}[TC-06] Menguji Ekspor CSV dan Integritas Format Data...{RESET}")
        if admin_token:
            code, headers, resp_bytes = api_request(
                "GET",
                "/admin/attendance/export/csv",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            
            c_type = headers.get("Content-Type", "") or headers.get("content-type", "")
            c_disp = headers.get("Content-Disposition", "") or headers.get("content-disposition", "")
            
            # Verifikasi UTF-8 BOM
            has_bom = resp_bytes.startswith(b"\xef\xbb\xbf")
            clean_text = resp_bytes[3:].decode("utf-8") if has_bom else resp_bytes.decode("utf-8")
            
            csv_reader = list(csv.reader(io.StringIO(clean_text)))
            
            if code == 200 and "text/csv" in c_type and len(csv_reader) >= 2:
                header_row = csv_reader[0]
                expected_headers = [
                    "No", "ID Presensi", "Tanggal", "Jam", "NIK", "Nama Karyawan",
                    "Jabatan", "Lokasi Kantor", "Jenis Presensi", "Status Kehadiran",
                    "Jarak (Meter)", "Tautan Foto", "Dikoreksi Oleh", "Waktu Koreksi", "Catatan Koreksi"
                ]
                
                header_valid = (header_row == expected_headers)
                found_ilham = any("F5512530109" in row for row in csv_reader[1:])
                
                if header_valid and found_ilham:
                    record_result("TC-06", "Verifikasi Ekspor Laporan CSV Presensi", "PASS", 
                                  f"HTTP 200 OK. BOM terdeteksi: {has_bom}, {len(csv_reader)-1} baris data ditemukan, Header kolom 100% valid.")
                else:
                    record_result("TC-06", "Verifikasi Ekspor Laporan CSV Presensi", "FAIL", 
                                  f"Header valid: {header_valid}, Data Ilham terdeteksi: {found_ilham}, Total baris: {len(csv_reader)}")
            else:
                record_result("TC-06", "Verifikasi Ekspor Laporan CSV Presensi", "FAIL", 
                              f"HTTP {code}, Content-Type: {c_type}, Jumlah baris: {len(csv_reader)}")
        else:
            record_result("TC-06", "Verifikasi Ekspor Laporan CSV Presensi", "FAIL", "Admin token tidak tersedia")

    finally:
        if server_proc:
            print(f"\n{YELLOW}Menghentikan proses server Go lokal (PID {server_proc.pid})...{RESET}")
            server_proc.terminate()
            server_proc.wait()

    # -------------------------------------------------------------
    # Rangkuman Pengujian
    # -------------------------------------------------------------
    total = len(test_results)
    passed = sum(1 for r in test_results if r["status"] == "PASS")
    failed = total - passed

    print(f"\n{BOLD}==================================================================={RESET}")
    print(f"{BOLD}  RANGKUMAN HASIL AUDIT PENGUJIAN QA INTEGRASI END-TO-END         {RESET}")
    print(f"{BOLD}==================================================================={RESET}")
    print(f"Total Test Cases : {total}")
    print(f"Passed           : {GREEN}{passed}{RESET}")
    print(f"Failed           : {RED}{failed}{RESET}")
    print(f"Success Rate     : {BOLD}{((passed/total)*100):.1f}%{RESET}")
    print(f"{BOLD}===================================================================\n{RESET}")

    if failed > 0:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == "__main__":
    run_tests()
