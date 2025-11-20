#[cfg(target_os = "windows")] use std::ffi::OsStr;
#[cfg(target_os = "windows")] use std::ffi::c_void;
#[cfg(target_os = "windows")] use std::os::windows::ffi::OsStrExt;

#[cfg(target_os = "windows")]
#[link(name = "user32")]
unsafe extern "system" {
    pub unsafe fn MessageBoxW(
        hWnd: *mut c_void,
        lpText: *const u16,
        lpCaption: *const u16,
        uType: u32,
    ) -> i32;
}

pub const MB_ICONERROR: u32 = 0x00000010;

#[cfg(target_os = "windows")]
pub fn message_box(text: &str, caption: &str, u_type: u32) -> i32 {
    let text_wide: Vec<u16> = OsStr::new(text)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();
    let caption_wide: Vec<u16> = OsStr::new(caption)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    unsafe {
        MessageBoxW(
            std::ptr::null_mut(),
            text_wide.as_ptr(),
            caption_wide.as_ptr(),
            u_type,
        )
    }
}

#[cfg(not(target_os = "windows"))]
pub fn message_box(_: &str, _: &str, _: u32) -> i32 {
    0
}
