"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

// Vertex shader for the text mask
const vertexShaderText = `
precision highp float;
uniform vec2    u_mouse;
uniform float   u_time;
varying vec3    v_position;
varying vec3    v_normal;
varying vec2    v_texcoord;

void main(void) {
  v_position = position;
  v_normal = normal;
  v_texcoord = uv;

  v_position.y += u_mouse.x * 0.001;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(v_position, 1.0);
}
`;

// Fragment shader for the text mask
const fragmentShaderText = `
#ifndef HUE_SHIFT
#define HUE_SHIFT
vec3 hue_shift(vec3 color, float dhue) {
	float s = sin(dhue);
	float c = cos(dhue);
	return (color * c) + (color * s) * mat3(
		vec3(0.167444, 0.329213, -0.496657),
		vec3(-0.327948, 0.035669, 0.292279),
		vec3(1.250268, -1.047561, -0.202707)
	) + dot(vec3(0.299, 0.587, 0.114), color) * (1.0 - c);
}
#endif

#ifndef FNC_RANDOM
#define FNC_RANDOM
float random(in float x) {
  return fract(sin(x) * 43758.5453);
}

float random(in vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

float random(in vec3 pos) {
  return fract(sin(dot(pos.xyz, vec3(70.9898, 78.233, 32.4355))) * 43758.5453123);
}

float random(in vec4 pos) {
  float dot_product = dot(pos, vec4(12.9898,78.233,45.164,94.673));
  return fract(sin(dot_product) * 43758.5453);
}

#ifndef RANDOM_SCALE3
#define RANDOM_SCALE3 vec3(.1031, .1030, .0973)
#endif

#ifndef RANDOM_SCALE4
#define RANDOM_SCALE4 vec4(1031, .1030, .0973, .1099)
#endif
vec2 random2(float p) {
  vec3 p3 = fract(vec3(p) * RANDOM_SCALE3);
  p3 += dot(p3, p3.yzx + 19.19);
  return fract((p3.xx+p3.yz)*p3.zy);
}

vec2 random2(vec2 p) {
  vec3 p3 = fract(p.xyx * RANDOM_SCALE3);
  p3 += dot(p3, p3.yzx + 19.19);
  return fract((p3.xx+p3.yz)*p3.zy);
}

vec2 random2(vec3 p3) {
  p3 = fract(p3 * RANDOM_SCALE3);
  p3 += dot(p3, p3.yzx+19.19);
  return fract((p3.xx+p3.yz)*p3.zy);
}

vec3 random3(float p) {
  vec3 p3 = fract(vec3(p) * RANDOM_SCALE3);
  p3 += dot(p3, p3.yzx+19.19);
  return fract((p3.xxy+p3.yzz)*p3.zyx);
}

vec3 random3(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * RANDOM_SCALE3);
  p3 += dot(p3, p3.yxz+19.19);
  return fract((p3.xxy+p3.yzz)*p3.zyx);
}

vec3 random3(vec3 p) {
  p = fract(p * RANDOM_SCALE3);
  p += dot(p, p.yxz+19.19);
  return fract((p.xxy + p.yzz)*p.zyx);
}

vec4 random4(float p) {
  vec4 p4 = fract(vec4(p) * RANDOM_SCALE4);
  p4 += dot(p4, p4.wzxy+19.19);
  return fract((p4.xxyz+p4.yzzw)*p4.zywx);
}

vec4 random4(vec2 p) {
  vec4 p4 = fract(vec4(p.xyxy) * RANDOM_SCALE4);
  p4 += dot(p4, p4.wzxy+19.19);
  return fract((p4.xxyz+p4.yzzw)*p4.zywx);
}

vec4 random4(vec3 p) {
  vec4 p4 = fract(vec4(p.xyzx)  * RANDOM_SCALE4);
  p4 += dot(p4, p4.wzxy+19.19);
  return fract((p4.xxyz+p4.yzzw)*p4.zywx);
}

vec4 random4(vec4 p4) {
  p4 = fract(p4  * RANDOM_SCALE4);
  p4 += dot(p4, p4.wzxy+19.19);
  return fract((p4.xxyz+p4.yzzw)*p4.zywx);
}
#endif

precision highp float;

uniform vec2        u_mouse;
uniform float       u_scrollY;
uniform sampler2D   u_tex0;
uniform vec2        u_tex0Resolution;
uniform float       u_devicePixelScale;
uniform sampler2D   u_tex1;
// uniform vec2        u_tex1Resolution;
uniform sampler2D   u_tex2;
uniform sampler2D   u_tex3;
// uniform vec3        u_light;
uniform float       u_hueRotation;
uniform vec2        u_resolution;
uniform float       u_time;

varying vec3        v_position;
varying vec3        v_normal;
varying vec2        v_texcoord;

// vec3 A = vec3(0.4, 0.45, 0.94);
// vec3 B = vec3(0.43, 0.68, 0.87);

void main(void) {
  // vec4 color = vec4(0.0, 0.0, 0.0, 1.0);
  float scrollShift = u_scrollY * 0.0008;
  // color.rg = v_texcoord;

  vec2 pixel = 1.0/u_resolution;
  vec2 st = vec2(gl_FragCoord.xy * pixel);

  // Position logo in the remaining space on the right (sidebar is shifted by 6vw and is max(35vw, 500px) wide)
  float physicalSidebarWidth = 500.0 * u_devicePixelScale * 2.0;
  float sidebarFraction = 0.06 + max(0.35, physicalSidebarWidth / u_resolution.x);
  float centerX = sidebarFraction + (1.0 - sidebarFraction) * 0.5;
  float centerY = 0.5;
  float logoWidthFraction = 0.92 * (1.0 - sidebarFraction);

  if (u_resolution.x < 900.0 * u_devicePixelScale * 2.0) {
    centerX = 0.5;
    centerY = 0.5;
    logoWidthFraction = 0.95;
  }

  float viewAspect = u_resolution.x / u_resolution.y;
  float logoAspect = u_tex0Resolution.x / u_tex0Resolution.y;
  
  vec2 logoSize = vec2(logoWidthFraction, logoWidthFraction * viewAspect / logoAspect);

  if (logoSize.y > 0.82) {
    logoSize.y = 0.82;
    logoSize.x = 0.82 * logoAspect / viewAspect;
  }

  vec2 texCoord = (st - vec2(centerX, centerY)) / logoSize + 0.5;
  float text = 1.0;

  if (texCoord.x >= 0.0 && texCoord.x <= 1.0 && texCoord.y >= 0.0 && texCoord.y <= 1.0) {
    float dissolve = max(0.0, random(st) * (scrollShift) * 0.75);
    float textScale = (1. + scrollShift * -1.0);
    float textShiftX = scrollShift * (sin(st.x * 7.) + 0.2);
    float textShiftY = scrollShift * sin(st.x * 5.) + scrollShift;
    
    vec2 shiftedTexCoord = (texCoord - 0.5) * textScale + 0.5;
    shiftedTexCoord.x += dissolve - textShiftX;
    shiftedTexCoord.y -= textShiftY;
    
    if (shiftedTexCoord.x >= 0.0 && shiftedTexCoord.x <= 1.0 && shiftedTexCoord.y >= 0.0 && shiftedTexCoord.y <= 1.0) {
      text = texture2D(u_tex0, shiftedTexCoord).r;
    }
  }

  vec2 uv = vec2(v_texcoord.y, (v_texcoord.x + v_texcoord.y) * sin(v_texcoord.x * 3.));
  uv.x = 1.0-uv.x;

  vec2 uv2 = uv * vec2(4.0, 18.0) - vec2(u_time * 0.004, 0.0);
  uv2.y += sin(uv.x + u_time * 0.2) * 0.1;

  vec2 uv3 = uv * vec2(51.0, 5.5) - vec2(u_time * 0.004, 0.0);
  uv3.y += sin(uv.x + u_time * 0.2) * 0.4;

  // vec3 light_dir = u_light;
  vec3 normalmap = texture2D(u_tex2, vec2(uv2.x, uv2.y)).yxz * 16.0 - 1.0;
  vec3 normal = normalmap;

  vec3 noisemap = texture2D(u_tex3, vec2(uv3.x, uv3.y)).yxz * 2.0 - 1.0;
  vec3 noise = noisemap;

  vec4 color = texture2D(u_tex1, vec2(uv2.x, uv2.y));

  color.rgb += pow(dot(normal * 0.1, vec3(1.0,1.0,1.0)) * 0.5, 1.5) * 0.15;
  color.r -= pow(1.0 - dot(noise * 0.13, vec3(1.0,1.0,1.0)) * 3.8, 1.3) * 0.06;
  color.g -= pow(1.0 - dot(noise * 0.14, vec3(1.0,1.0,1.0)) * 3.9, 1.2) * 0.06;
  color.b -= pow(1.0 - dot(noise * 0.05, vec3(1.0,1.0,1.0)) * 2.5, 1.1) * 0.08;
  
  color.rgb = mix(mix(vec3(1.0), color.rgb - scrollShift, clamp(1.0 - scrollShift * 4., 0.0, 1.0)),
                  vec3(1.0),
                  text);
                  
  color.rgb = hue_shift(color.rgb, u_hueRotation);
  gl_FragColor = color;
}
`;

// Vertex shader for the 3D wavy ribbon
const vertexShaderStripe = `
#define QTR_PI 0.78539816339
#define HALF_PI 1.5707963267948966192313216916398
#define PI 3.1415926535897932384626433832795
#define TWO_PI 6.2831853071795864769252867665590
#define TAU 6.2831853071795864769252867665590
#define ONE_OVER_PI 0.31830988618
#define SQRT_HALF_PI 1.25331413732
#define PHI 1.618033988749894848204586834
#define EPSILON 0.0000001
#define GOLDEN_RATIO 1.6180339887
#define GOLDEN_RATIO_CONJUGATE 0.61803398875
#define GOLDEN_ANGLE 2.39996323

#ifndef FNC_RANDOM
#define FNC_RANDOM
float random(in float x) {
  return fract(sin(x) * 43758.5453);
}
float random(in vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453);
}
float random(in vec3 pos) {
  return fract(sin(dot(pos.xyz, vec3(70.9898, 78.233, 32.4355))) * 43758.5453123);
}
float random(in vec4 pos) {
  float dot_product = dot(pos, vec4(12.9898,78.233,45.164,94.673));
  return fract(sin(dot_product) * 43758.5453);
}

#ifndef RANDOM_SCALE3
#define RANDOM_SCALE3 vec3(.1031, .1030, .0973)
#endif
#ifndef RANDOM_SCALE4
#define RANDOM_SCALE4 vec4(1031, .1030, .0973, .1099)
#endif

vec2 random2(float p) {
  vec3 p3 = fract(vec3(p) * RANDOM_SCALE3);
  p3 += dot(p3, p3.yzx + 19.19);
  return fract((p3.xx+p3.yz)*p3.zy);
}
vec2 random2(vec2 p) {
  vec3 p3 = fract(p.xyx * RANDOM_SCALE3);
  p3 += dot(p3, p3.yzx + 19.19);
  return fract((p3.xx+p3.yz)*p3.zy);
}
vec2 random2(vec3 p3) {
  p3 = fract(p3 * RANDOM_SCALE3);
  p3 += dot(p3, p3.yzx+19.19);
  return fract((p3.xx+p3.yz)*p3.zy);
}
vec3 random3(float p) {
  vec3 p3 = fract(vec3(p) * RANDOM_SCALE3);
  p3 += dot(p3, p3.yzx+19.19);
  return fract((p3.xxy+p3.yzz)*p3.zyx);
}
vec3 random3(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * RANDOM_SCALE3);
  p3 += dot(p3, p3.yxz+19.19);
  return fract((p3.xxy+p3.yzz)*p3.zyx);
}
vec3 random3(vec3 p) {
  p = fract(p * RANDOM_SCALE3);
  p += dot(p, p.yxz+19.19);
  return fract((p.xxy + p.yzz)*p.zyx);
}
vec4 random4(float p) {
  vec4 p4 = fract(vec4(p) * RANDOM_SCALE4);
  p4 += dot(p4, p4.wzxy+19.19);
  return fract((p4.xxyz+p4.yzzw)*p4.zywx);
}
vec4 random4(vec2 p) {
  vec4 p4 = fract(vec4(p.xyxy) * RANDOM_SCALE4);
  p4 += dot(p4, p4.wzxy+19.19);
  return fract((p4.xxyz+p4.yzzw)*p4.zywx);
}
vec4 random4(vec3 p) {
  vec4 p4 = fract(vec4(p.xyzx)  * RANDOM_SCALE4);
  p4 += dot(p4, p4.wzxy+19.19);
  return fract((p4.xxyz+p4.yzzw)*p4.zywx);
}
vec4 random4(vec4 p4) {
  p4 = fract(p4  * RANDOM_SCALE4);
  p4 += dot(p4, p4.wzxy+19.19);
  return fract((p4.xxyz+p4.yzzw)*p4.zywx);
}
#endif

#ifndef FNC_SRANDOM
#define FNC_SRANDOM
float srandom(in float x) {
  return -1. + 2. * fract(sin(x) * 43758.5453);
}
float srandom(in vec2 st) {
  return -1. + 2. * fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453);
}
float srandom(in vec3 pos) {
  return -1. + 2. * fract(sin(dot(pos.xyz, vec3(70.9898, 78.233, 32.4355))) * 43758.5453123);
}
float srandom(in vec4 pos) {
  float dot_product = dot(pos, vec4(12.9898,78.233,45.164,94.673));
  return -1. + 2. * fract(sin(dot_product) * 43758.5453);
}
vec2 srandom2(in vec2 st) {
  const vec2 k = vec2(.3183099, .3678794);
  st = st * k + k.yx;
  return -1. + 2. * fract(16. * k * fract(st.x * st.y * (st.x + st.y)));
}
vec3 srandom3(in vec3 p) {
  p = vec3( dot(p, vec3(127.1, 311.7, 74.7)),
          dot(p, vec3(269.5, 183.3, 246.1)),
          dot(p, vec3(113.5, 271.9, 124.6)));
  return -1. + 2. * fract(sin(p) * 43758.5453123);
}
vec2 srandom2(in vec2 p, const in float tileLength) {
  p = mod(p, vec2(tileLength));
  return srandom2(p);
}
vec3 srandom3(in vec3 p, const in float tileLength) {
  p = mod(p, vec3(tileLength));
  return srandom3(p);
}
#endif

#ifndef FNC_CUBIC
#define FNC_CUBIC
float cubic(const in float v) { return v*v*(3.0-2.0*v); }
vec2  cubic(const in vec2 v)  { return v*v*(3.0-2.0*v); }
vec3  cubic(const in vec3 v)  { return v*v*(3.0-2.0*v); }
vec4  cubic(const in vec4 v)  { return v*v*(3.0-2.0*v); }
float cubic(const in float value, in float slope0, in float slope1) {
  float a = slope0 + slope1 - 2.;
  float b = -2. * slope0 - slope1 + 3.;
  float c = slope0;
  float value2 = value * value;
  float value3 = value * value2;
  return a * value3 + b * value2 + c * value;
}
vec2 cubic(const in vec2 value, in float slope0, in float slope1) {
  float a = slope0 + slope1 - 2.;
  float b = -2. * slope0 - slope1 + 3.;
  float c = slope0;
  vec2 value2 = value * value;
  vec2 value3 = value * value2;
  return a * value3 + b * value2 + c * value;
}
vec3 cubic(const in vec3 value, in float slope0, in float slope1) {
  float a = slope0 + slope1 - 2.;
  float b = -2. * slope0 - slope1 + 3.;
  float c = slope0;
  vec3 value2 = value * value;
  vec3 value3 = value * value2;
  return a * value3 + b * value2 + c * value;
}
vec4 cubic(const in vec4 value, in float slope0, in float slope1) {
  float a = slope0 + slope1 - 2.;
  float b = -2. * slope0 - slope1 + 3.;
  float c = slope0;
  vec4 value2 = value * value;
  vec4 value3 = value * value2;
  return a * value3 + b * value2 + c * value;
}
#endif

#ifndef FNC_QUINTIC
#define FNC_QUINTIC
float quintic(const in float v) { return v*v*v*(v*(v*6.0-15.0)+10.0); }
vec2  quintic(const in vec2 v)  { return v*v*v*(v*(v*6.0-15.0)+10.0); }
vec3  quintic(const in vec3 v)  { return v*v*v*(v*(v*6.0-15.0)+10.0); }
vec4  quintic(const in vec4 v)  { return v*v*v*(v*(v*6.0-15.0)+10.0); }
#endif

#ifndef FNC_GNOISE
#define FNC_GNOISE
float gnoise(float x) {
  float i = floor(x);
  float f = fract(x);
  return mix(random(i), random(i + 1.0), smoothstep(0.,1.,f));
}
float gnoise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = random(i);
  float b = random(i + vec2(1.0, 0.0));
  float c = random(i + vec2(0.0, 1.0));
  float d = random(i + vec2(1.0, 1.0));
  vec2 u = cubic(f);
  return mix( a, b, u.x) +
              (c - a)* u.y * (1.0 - u.x) +
              (d - b) * u.x * u.y;
}
float gnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = quintic(f);
  return -1.0 + 2.0 * mix( mix( mix( random(i + vec3(0.0,0.0,0.0)),
                                      random(i + vec3(1.0,0.0,0.0)), u.x),
                              mix( random(i + vec3(0.0,1.0,0.0)),
                                      random(i + vec3(1.0,1.0,0.0)), u.x), u.y),
                          mix( mix( random(i + vec3(0.0,0.0,1.0)),
                                      random(i + vec3(1.0,0.0,1.0)), u.x),
                              mix( random(i + vec3(0.0,1.0,1.0)),
                                      random(i + vec3(1.0,1.0,1.0)), u.x), u.y), u.z );
}
float gnoise(vec3 p, float tileLength) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = quintic(f);
  return mix( mix( mix( dot( srandom3(i + vec3(0.0,0.0,0.0), tileLength), f - vec3(0.0,0.0,0.0)),
                          dot( srandom3(i + vec3(1.0,0.0,0.0), tileLength), f - vec3(1.0,0.0,0.0)), u.x),
                  mix( dot( srandom3(i + vec3(0.0,1.0,0.0), tileLength), f - vec3(0.0,1.0,0.0)),
                          dot( srandom3(i + vec3(1.0,1.0,0.0), tileLength), f - vec3(1.0,1.0,0.0)), u.x), u.y),
              mix( mix( dot( srandom3(i + vec3(0.0,0.0,1.0), tileLength), f - vec3(0.0,0.0,1.0)),
                          dot( srandom3(i + vec3(1.0,0.0,1.0), tileLength), f - vec3(1.0,0.0,1.0)), u.x),
                  mix( dot( srandom3(i + vec3(0.0,1.0,1.0), tileLength), f - vec3(0.0,1.0,1.0)),
                          dot( srandom3(i + vec3(1.0,1.0,1.0), tileLength), f - vec3(1.0,1.0,1.0)), u.x), u.y), u.z );
}
#endif

#ifndef FNC_MOD289
#define FNC_MOD289
float mod289(const in float x) { return x - floor(x * (1. / 289.)) * 289.; }
vec2 mod289(const in vec2 x) { return x - floor(x * (1. / 289.)) * 289.; }
vec3 mod289(const in vec3 x) { return x - floor(x * (1. / 289.)) * 289.; }
vec4 mod289(const in vec4 x) { return x - floor(x * (1. / 289.)) * 289.; }
#endif

#ifndef FNC_PERMUTE
#define FNC_PERMUTE
float permute(const in float x) { return mod289(((x * 34.0) + 1.0) * x); }
vec2 permute(const in vec2 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec3 permute(const in vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 permute(const in vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
#endif

#ifndef FNC_GRAD4
#define FNC_GRAD4
vec4 grad4(float j, vec4 ip) {
  const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
  vec4 p,s;
  p.xyz = floor( fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
  p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
  s = vec4(lessThan(p, vec4(0.0)));
  p.xyz = p.xyz + (s.xyz*2.0 - 1.0) * s.www;
  return p;
}
#endif

#ifndef FNC_TAYLORINVSQRT
#define FNC_TAYLORINVSQRT
float taylorInvSqrt(in float r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec2 taylorInvSqrt(in vec2 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec3 taylorInvSqrt(in vec3 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec4 taylorInvSqrt(in vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
#endif

#ifndef FNC_SNOISE
#define FNC_SNOISE
float snoise(in vec2 v) {
  const vec4 C = vec4(0.211324865405187,
                      0.366025403784439,
                      -0.577350269189626,
                      0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
  + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
float snoise(in vec3 v) {
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 =   v - i + dot(i, C.xxx) ;
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute( permute( permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
  float n_ = 0.142857142857;
  vec3  ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                              dot(p2,x2), dot(p3,x3) ) );
}
float snoise(in vec4 v) {
  const vec4  C = vec4( 0.138196601125011,
                      0.276393202250021,
                      0.414589803375032,
                      -0.447213595499958);
  vec4 i  = floor(v + dot(v, vec4(.309016994374947451)) );
  vec4 x0 = v -   i + dot(i, C.xxxx);
  vec4 i0;
  vec3 isX = step( x0.yzw, x0.xxx );
  vec3 isYZ = step( x0.zww, x0.yyz );
  i0.x = isX.x + isX.y + isX.z;
  i0.yzw = 1.0 - isX;
  i0.y += isYZ.x + isYZ.y;
  i0.zw += 1.0 - isYZ.xy;
  i0.z += isYZ.z;
  i0.w += 1.0 - isYZ.z;
  vec4 i3 = clamp( i0, 0.0, 1.0 );
  vec4 i2 = clamp( i0-1.0, 0.0, 1.0 );
  vec4 i1 = clamp( i0-2.0, 0.0, 1.0 );
  vec4 x1 = x0 - i1 + C.xxxx;
  vec4 x2 = x0 - i2 + C.yyyy;
  vec4 x3 = x0 - i3 + C.zzzz;
  vec4 x4 = x0 + C.wwww;
  i = mod289(i);
  float j0 = permute( permute( permute( permute(i.w) + i.z) + i.y) + i.x);
  vec4 j1 = permute( permute( permute( permute (
              i.w + vec4(i1.w, i2.w, i3.w, 1.0 ))
          + i.z + vec4(i1.z, i2.z, i3.z, 1.0 ))
          + i.y + vec4(i1.y, i2.y, i3.y, 1.0 ))
          + i.x + vec4(i1.x, i2.x, i3.x, 1.0 ));
  vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0) ;
  vec4 p0 = grad4(j0,   ip);
  vec4 p1 = grad4(j1.x, ip);
  vec4 p2 = grad4(j1.y, ip);
  vec4 p3 = grad4(j1.z, ip);
  vec4 p4 = grad4(j1.w, ip);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  p4 *= taylorInvSqrt(dot(p4,p4));
  vec3 m0 = max(0.6 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);
  vec2 m1 = max(0.6 - vec2(dot(x3,x3), dot(x4,x4)            ), 0.0);
  m0 = m0 * m0;
  m1 = m1 * m1;
  return 49.0 * ( dot(m0*m0, vec3( dot( p0, x0 ), dot( p1, x1 ), dot( p2, x2 )))
              + dot(m1*m1, vec2( dot( p3, x3 ), dot( p4, x4 ) ) ) ) ;
}
vec2 snoise2( vec2 x ){
  float s  = snoise(vec2( x ));
  float s1 = snoise(vec2( x.y - 19.1, x.x + 47.2 ));
  return vec2( s , s1 );
}
vec3 snoise3( vec3 x ){
  float s  = snoise(vec3( x ));
  float s1 = snoise(vec3( x.y - 19.1 , x.z + 33.4 , x.x + 47.2 ));
  float s2 = snoise(vec3( x.z + 74.2 , x.x - 124.5 , x.y + 99.4 ));
  return vec3( s , s1 , s2 );
}
vec3 snoise3( vec4 x ){
  float s  = snoise(vec4( x ));
  float s1 = snoise(vec4( x.y - 19.1 , x.z + 33.4 , x.x + 47.2, x.w ));
  float s2 = snoise(vec4( x.z + 74.2 , x.x - 124.5 , x.y + 99.4, x.w ));
  return vec3( s , s1 , s2 );
}
#endif

#ifndef FNC_FBM
#define FNC_FBM
#ifndef FBM_OCTAVES
#define FBM_OCTAVES 4
#endif
#ifndef FBM_NOISE_FNC
#define FBM_NOISE_FNC(UV) snoise(UV)
#endif
#ifndef FBM_NOISE2_FNC
#define FBM_NOISE2_FNC(UV) FBM_NOISE_FNC(UV)
#endif
#ifndef FBM_NOISE3_FNC
#define FBM_NOISE3_FNC(UV) FBM_NOISE_FNC(UV)
#endif
#ifndef FBM_NOISE_TILABLE_FNC
#define FBM_NOISE_TILABLE_FNC(UV, TILE) gnoise(UV, TILE)
#endif
#ifndef FBM_NOISE3_TILABLE_FNC
#define FBM_NOISE3_TILABLE_FNC(UV, TILE) FBM_NOISE_TILABLE_FNC(UV, TILE)
#endif
#ifndef FBM_NOISE_TYPE
#define FBM_NOISE_TYPE float
#endif
#ifndef FBM_VALUE_INITIAL
#define FBM_VALUE_INITIAL 0.0
#endif
#ifndef FBM_SCALE_SCALAR
#define FBM_SCALE_SCALAR 2.0
#endif
#ifndef FBM_AMPLITUD_INITIAL
#define FBM_AMPLITUD_INITIAL 0.5
#endif
#ifndef FBM_AMPLITUD_SCALAR
#define FBM_AMPLITUD_SCALAR 0.5
#endif

FBM_NOISE_TYPE fbm(in vec2 st) {
  FBM_NOISE_TYPE value = FBM_NOISE_TYPE(FBM_VALUE_INITIAL);
  float amplitud = FBM_AMPLITUD_INITIAL;
  for (int i = 0; i < FBM_OCTAVES; i++) {
      value += amplitud * FBM_NOISE2_FNC(st);
      st *= FBM_SCALE_SCALAR;
      amplitud *= FBM_AMPLITUD_SCALAR;
  }
  return value;
}
FBM_NOISE_TYPE fbm(in vec3 pos) {
  FBM_NOISE_TYPE value = FBM_NOISE_TYPE(FBM_VALUE_INITIAL);
  float amplitud = FBM_AMPLITUD_INITIAL;
  for (int i = 0; i < FBM_OCTAVES; i++) {
      value += amplitud * FBM_NOISE3_FNC(pos);
      pos *= FBM_SCALE_SCALAR;
      amplitud *= FBM_AMPLITUD_SCALAR;
  }
  return value;
}
FBM_NOISE_TYPE fbm(vec3 p, float tileLength) {
  const float persistence = 0.5;
  const float lacunarity = 2.0;
  float amplitude = 0.5;
  float total = 0.0;
  float normalization = 0.0;
  for (int i = 0; i < FBM_OCTAVES; ++i) {
      float noiseValue = FBM_NOISE3_TILABLE_FNC(p, tileLength * lacunarity * 0.5) * 0.5 + 0.5;
      total += noiseValue * amplitude;
      normalization += amplitude;
      amplitude *= persistence;
      p = p * lacunarity;
  }
  return total / normalization;
}
#endif

precision highp float;
uniform vec2    u_mouse;
uniform float   u_time;
uniform float   u_scrollY;
// uniform float   u_scrollVelocity;
varying vec3    v_position;
varying vec3    v_normal;
varying vec2    v_texcoord;

attribute vec4  tangent;
varying vec4    v_tangent;
varying mat3    v_tangentToWorld;

vec3 displace(vec3 _pos, float timeVal, float scrollYVal, vec2 mouseVal) {
  float mouseShiftY = (mouseVal.x - _pos.x) * -0.00003;
  float mouseShiftX = (mouseVal.y - _pos.y) * -0.00006;
  float curveZ = cos((_pos.y * 0.3 + 0.55) * HALF_PI) * -0.8;
  float curveX = cos((_pos.y * 0.3 + 0.55) * HALF_PI) * 3.4;
  float curveX2 = sin((_pos.y * 12. + 0.55 + timeVal * 0.55) * HALF_PI) * 0.01;
  float curveX3 = sin((_pos.y * 3.2 + 1.55 + timeVal * 0.52) * HALF_PI + timeVal * 0.25 + scrollYVal * 0.002) * 0.05;
  float curveY = cos(_pos.x * HALF_PI * 0.5 + scrollYVal * 0.0003) * -0.4;
  float curveY2 = sin(timeVal * 0.5 + _pos.x * HALF_PI * 3.5 + scrollYVal * 0.005) * 0.02;
  float curveY3 = cos(timeVal * 0.9 + _pos.x * HALF_PI * 17.5 + scrollYVal * 0.006) * 0.01;
  _pos.z += curveX + curveX2 + curveX3 + curveY + curveY2 + curveY3;
  _pos.z -= fbm(vec3( _pos.xy * 0.30 + sin(_pos.x * 0.01 - mouseShiftX) * 0.5 + mouseShiftY + scrollYVal * 0.00002, 0.004) ) * 1.0;
  _pos.y -= fbm(vec3( _pos.xy * 0.13 + sin(_pos.x * 0.01 + mouseShiftY) * 0.9 + mouseShiftX + scrollYVal * 0.00002, 0.005) ) * 0.7;
  _pos.y -= fbm(vec3( _pos.xy * 0.13 + sin(_pos.y * 0.01 - mouseShiftY) * 0.9 + mouseShiftX + scrollYVal * 0.00002, 0.005) ) * 1.3;
  _pos.x -= fbm(vec3( _pos.yz * 0.2 + sin(_pos.x * 0.01 - mouseShiftY) * 0.3 + mouseShiftX + scrollYVal * 0.00002 + timeVal * 0.02, 0.05) ) * 0.54;
  _pos.x -= curveZ;
  return _pos;
}

void main(void) {
  v_position = position;
  v_normal = normal;
  v_texcoord = uv;

  vec3 pos = displace(v_position.xyz, u_time, u_scrollY, u_mouse);
  float offset = 0.01;
  v_normal = cross( displace(v_position.xyz - vec3(0.0, offset, 0.0), u_time, u_scrollY, u_mouse) - pos, displace(v_position.xyz - vec3(offset, 0.0, 0.0), u_time, u_scrollY, u_mouse) - pos  );
  v_position.xyz = pos * 1.55;

  v_position.z -= 4.5;
  v_position.y += 0.2;

  v_tangent = tangent;
  vec3 worldTangent = tangent.xyz;
  vec3 worldBiTangent = cross(v_normal, worldTangent);
  v_tangentToWorld = mat3(normalize(worldTangent), normalize(worldBiTangent), normalize(v_normal));

  gl_Position = projectionMatrix * modelViewMatrix * vec4(v_position, 1.0);
}
`;

// Fragment shader for the 3D wavy ribbon
const fragmentShaderStripe = `
#ifndef HUE_SHIFT
#define HUE_SHIFT
vec3 hue_shift(vec3 color, float dhue) {
	float s = sin(dhue);
	float c = cos(dhue);
	return (color * c) + (color * s) * mat3(
		vec3(0.167444, 0.329213, -0.496657),
		vec3(-0.327948, 0.035669, 0.292279),
		vec3(1.250268, -1.047561, -0.202707)
	) + dot(vec3(0.299, 0.587, 0.114), color) * (1.0 - c);
}
#endif

#ifndef FNC_RANDOM
#define FNC_RANDOM
float random(in float x) {
  return fract(sin(x) * 43758.5453);
}
float random(in vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453);
}
float random(in vec3 pos) {
  return fract(sin(dot(pos.xyz, vec3(70.9898, 78.233, 32.4355))) * 43758.5453123);
}
float random(in vec4 pos) {
  float dot_product = dot(pos, vec4(12.9898,78.233,45.164,94.673));
  return fract(sin(dot_product) * 43758.5453);
}

#ifndef RANDOM_SCALE3
#define RANDOM_SCALE3 vec3(.1031, .1030, .0973)
#endif
#ifndef RANDOM_SCALE4
#define RANDOM_SCALE4 vec4(1031, .1030, .0973, .1099)
#endif

vec2 random2(float p) {
  vec3 p3 = fract(vec3(p) * RANDOM_SCALE3);
  p3 += dot(p3, p3.yzx + 19.19);
  return fract((p3.xx+p3.yz)*p3.zy);
}
vec2 random2(vec2 p) {
  vec3 p3 = fract(p.xyx * RANDOM_SCALE3);
  p3 += dot(p3, p3.yzx + 19.19);
  return fract((p3.xx+p3.yz)*p3.zy);
}
vec2 random2(vec3 p3) {
  p3 = fract(p3 * RANDOM_SCALE3);
  p3 += dot(p3, p3.yzx+19.19);
  return fract((p3.xx+p3.yz)*p3.zy);
}
vec3 random3(float p) {
  vec3 p3 = fract(vec3(p) * RANDOM_SCALE3);
  p3 += dot(p3, p3.yzx+19.19);
  return fract((p3.xxy+p3.yzz)*p3.zyx);
}
vec3 random3(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * RANDOM_SCALE3);
  p3 += dot(p3, p3.yxz+19.19);
  return fract((p3.xxy+p3.yzz)*p3.zyx);
}
vec3 random3(vec3 p) {
  p = fract(p * RANDOM_SCALE3);
  p += dot(p, p.yxz+19.19);
  return fract((p.xxy + p.yzz)*p.zyx);
}
vec4 random4(float p) {
  vec4 p4 = fract(vec4(p) * RANDOM_SCALE4);
  p4 += dot(p4, p4.wzxy+19.19);
  return fract((p4.xxyz+p4.yzzw)*p4.zywx);
}
vec4 random4(vec2 p) {
  vec4 p4 = fract(vec4(p.xyxy) * RANDOM_SCALE4);
  p4 += dot(p4, p4.wzxy+19.19);
  return fract((p4.xxyz+p4.yzzw)*p4.zywx);
}
vec4 random4(vec3 p) {
  vec4 p4 = fract(vec4(p.xyzx)  * RANDOM_SCALE4);
  p4 += dot(p4, p4.wzxy+19.19);
  return fract((p4.xxyz+p4.yzzw)*p4.zywx);
}
vec4 random4(vec4 p4) {
  p4 = fract(p4  * RANDOM_SCALE4);
  p4 += dot(p4, p4.wzxy+19.19);
  return fract((p4.xxyz+p4.yzzw)*p4.zywx);
}
#endif

precision highp float;

uniform vec2        u_mouse;
uniform float       u_scrollY;
// uniform float       u_scrollVelocity;
uniform sampler2D   u_tex0;
uniform vec2        u_tex0Resolution;
uniform float       u_devicePixelScale;
uniform sampler2D   u_tex1;
// uniform vec2        u_tex1Resolution;
uniform sampler2D   u_tex2;
uniform sampler2D   u_tex3;
uniform vec3        u_light;
uniform float       u_hueRotation;
uniform vec2        u_resolution;
uniform float       u_time;

varying vec3        v_position;
varying vec3        v_normal;
varying vec2        v_texcoord;

varying vec4        v_tangent;
varying mat3        v_tangentToWorld;

// vec3 A = vec3(0.4, 0.45, 0.94);
// vec3 B = vec3(0.43, 0.68, 0.87);

void main(void) {
  // vec4 color = vec4(0.0, 0.0, 0.0, 1.0);
  float scrollShift = u_scrollY * 0.0008;
  // color.rg = v_texcoord;

  vec2 pixel = 1.0/u_resolution;
  vec2 st = vec2(gl_FragCoord.xy * pixel);

  // Position logo in the remaining space on the right (sidebar is shifted by 6vw and is max(35vw, 500px) wide)
  float physicalSidebarWidth = 500.0 * u_devicePixelScale * 2.0;
  float sidebarFraction = 0.06 + max(0.35, physicalSidebarWidth / u_resolution.x);
  float centerX = sidebarFraction + (1.0 - sidebarFraction) * 0.5;
  float centerY = 0.5;
  float logoWidthFraction = 0.92 * (1.0 - sidebarFraction);

  if (u_resolution.x < 900.0 * u_devicePixelScale * 2.0) {
    centerX = 0.5;
    centerY = 0.5;
    logoWidthFraction = 0.95;
  }

  float viewAspect = u_resolution.x / u_resolution.y;
  float logoAspect = u_tex0Resolution.x / u_tex0Resolution.y;
  
  vec2 logoSize = vec2(logoWidthFraction, logoWidthFraction * viewAspect / logoAspect);

  if (logoSize.y > 0.82) {
    logoSize.y = 0.82;
    logoSize.x = 0.82 * logoAspect / viewAspect;
  }

  vec2 texCoord = (st - vec2(centerX, centerY)) / logoSize + 0.5;
  float text = 1.0;

  if (texCoord.x >= 0.0 && texCoord.x <= 1.0 && texCoord.y >= 0.0 && texCoord.y <= 1.0) {
    float dissolve = max(0.0, random(st) * (scrollShift) * 0.75);
    float textScale = (1. + scrollShift * -1.0);
    // Use the exact same shift parameters as fragmentShaderText for perfect alignment
    float textShiftX = scrollShift * (sin(st.x * 7.) + 0.2);
    float textShiftY = scrollShift * sin(st.x * 5.) + scrollShift;
    
    vec2 shiftedTexCoord = (texCoord - 0.5) * textScale + 0.5;
    shiftedTexCoord.x += dissolve - textShiftX;
    shiftedTexCoord.y -= textShiftY;
    
    if (shiftedTexCoord.x >= 0.0 && shiftedTexCoord.x <= 1.0 && shiftedTexCoord.y >= 0.0 && shiftedTexCoord.y <= 1.0) {
      text = texture2D(u_tex0, shiftedTexCoord).r;
    }
  }

  vec2 uv = v_texcoord.yx;
  uv.x = 1.0-uv.x;

  vec3 light_dir = u_light;
  vec2 uv2 = uv * vec2(2.0, 3.5) - vec2(u_time * 0.004, 0.0);
  uv2.y += sin(uv.x + u_time * 0.2) * 0.1;

  vec2 uv3 = uv * vec2(51.0, 5.5) - vec2(u_time * 0.004, 0.0);
  uv3.y += sin(uv.x + u_time * 0.2) * 0.4;

  vec3 normalmap = texture2D(u_tex2, uv2).yxz * 2.0 - 1.0;
  vec3 normal = v_tangentToWorld * normalmap;

  vec3 noisemap = texture2D(u_tex3, vec2(uv3.x, uv3.y)).yxz * 2.0 - 1.0;
  vec3 noise = v_tangentToWorld * noisemap;

  vec4 color = texture2D(u_tex1, vec2(uv2.x, uv2.y));

  color.r += pow(1.0 - dot(normal * 0.13, light_dir) * 3.8, 1.3) * 0.16;
  color.g += pow(1.0 - dot(normal * 0.15, light_dir) * 3.9, 1.2) * 0.16;
  color.b += pow(1.0 - dot(normal * 0.9, light_dir) * 2.5, 1.1) * 0.19;
  color.r -= pow(1.0 - dot(noise * 0.13, light_dir) * 3.8, 1.3) * 0.06;
  color.g -= pow(1.0 - dot(noise * 0.14, light_dir) * 3.9, 1.2) * 0.06;
  color.b -= pow(1.0 - dot(noise * 0.15, light_dir) * 2.5, 1.1) * 0.08;
  color.rgb = clamp(color.rgb, 0.01, 0.98);
  color.r = clamp(color.r, 0.24, 0.8);
  color.g = clamp(color.g, 0.04, 0.8);
  color.b = clamp(color.b, 0.6, 0.98);
  color.g += uv2.y * 0.06;

  color.rgb += (1. - smoothstep(pow((uv2.y - sin(uv.x + u_time * 0.2) * 0.1) * 0.5, 2.), 0.00006, 0.0001)) * 0.2;
  color.rgb += (1. - smoothstep(pow((uv2.y - sin(uv.x + u_time * 0.2) * 0.1) * 0.5, 2.), 0.00002, 0.0008)) * 0.15;
  color.rgb += (1. - smoothstep(pow((uv2.y - sin(uv.x + u_time * 0.2) * 0.1) * 0.5, 2.), 0.0, 0.00003)) * 0.3;

  /* Commented out to remove the middle background logo text
  color.rgb = mix(mix(color.rgb, vec3(1.0), clamp(1.0 - scrollShift * 4., 0.0, 1.0)),
                  color.rgb,
                  text);
  */

  color.rgb = hue_shift(color.rgb, u_hueRotation);
  gl_FragColor = color;
}
`;

class SessionsWave {
  private sessionsTextureLoadCount = 0;
  public sessionsWaveTexturesLoaded = false;
  private isHero = true;
  private scrollY = 0;
  private newScrollY = 0;
  private scrollVelocity = 0;
  private mouseX = 0;
  private mouseY = 0;
  private timeScale = 3.5;
  private fps = 60;
  private fpsRatio = 1;
  private skipFrame = 0;
  private colorFrame = 0;
  private isTouchScreen = false;
  private isScrolling = false;
  private isSmallScreen = false;
  private scrollTimeout?: NodeJS.Timeout | number;

  private sessionsTextureSrc = "/sessions_bw.png?v=16";
  private noiseTextureSrc = "/sessions_noise.png";
  private normalsTextureSrc = "/sessions_normals.png";
  private linesTextureSrc = "/sessions_texture.png";

  private sessionsTexture: THREE.Texture;
  private linesTexture: THREE.Texture;
  private normalsTexture: THREE.Texture;
  private noiseTexture: THREE.Texture;

  private uniforms: { [uniform: string]: THREE.IUniform };
  private renderer: THREE.WebGLRenderer;
  public canvas: HTMLCanvasElement;
  private camera: THREE.PerspectiveCamera;
  private clock: THREE.Clock;
  private scene: THREE.Scene;

  private stripeGeometry: THREE.PlaneGeometry;
  private textGeometry: THREE.PlaneGeometry;
  private textMaterial: THREE.ShaderMaterial;
  private stripeMaterial: THREE.ShaderMaterial;
  private stripeMesh: THREE.Mesh;
  private textMesh: THREE.Mesh;

  private scrollhandler: () => void;
  private mousemovehandler: (e: MouseEvent) => void;
  private touchstarthandler: () => void;
  private resizehandler: () => void;
  
  private containerElement: HTMLElement;
  private animationFrameId?: number;

  constructor(container: HTMLElement) {
    this.containerElement = container;
    this.scrollY = typeof window !== "undefined" ? window.scrollY : 0;
    this.newScrollY = this.scrollY;
    this.isSmallScreen = typeof window !== "undefined" ? window.innerWidth < 900 : false;

    const loader = new THREE.TextureLoader();
    const sessionsTextureLoaded = () => {
      this.sessionsTextureLoadCount += 1;
      if (this.sessionsTextureLoadCount === 4 && !this.sessionsWaveTexturesLoaded) {
        this.sessionsWaveTexturesLoaded = true;
        document.body.classList.add("Sessions23Wave--isLoaded");
      }
    };

    this.sessionsTexture = loader.load(this.sessionsTextureSrc, sessionsTextureLoaded);
    this.linesTexture = loader.load(this.linesTextureSrc, sessionsTextureLoaded);
    this.normalsTexture = loader.load(this.normalsTextureSrc, sessionsTextureLoaded);
    this.noiseTexture = loader.load(this.noiseTextureSrc, sessionsTextureLoaded);

    const repeatWrap = THREE.RepeatWrapping;
    this.linesTexture.wrapS = repeatWrap;
    this.linesTexture.wrapT = repeatWrap;
    this.normalsTexture.wrapS = repeatWrap;
    this.normalsTexture.wrapT = repeatWrap;
    this.noiseTexture.wrapS = repeatWrap;
    this.noiseTexture.wrapT = repeatWrap;

    this.normalsTexture.anisotropy = 2;
    this.noiseTexture.anisotropy = 2;
    this.linesTexture.anisotropy = 2;

    this.uniforms = {
      u_time: { value: 1.0 },
      u_resolution: { value: new THREE.Vector2() },
      u_mouse: { value: new THREE.Vector2() },
      u_hueRotation: { value: 0 },
      u_scrollY: { value: 0 },
      u_scrollVelocity: { value: 0 },
      u_tex0: { value: this.sessionsTexture },
      u_devicePixelScale: { value: 1 },
      u_tex0Resolution: { value: new THREE.Vector2(813 / 2, 201 / 2) },
      u_tex1: { value: this.linesTexture },
      u_tex1Resolution: { value: new THREE.Vector2(3840, 1080) },
      u_tex2: { value: this.normalsTexture },
      u_tex3: { value: this.noiseTexture },
      u_light: { value: new THREE.Vector3(5.2, 3.6, 2.4) },
      u_hueShift: { value: new THREE.Vector3(1, 1, 1) },
      u_widthScale: { value: 1 },
      u_heightScale: { value: 1 },
      u_frequency: { value: 1 }
    };

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.canvas = this.renderer.domElement;

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.clock = new THREE.Clock();
    this.scene = new THREE.Scene();

    this.stripeGeometry = new THREE.PlaneGeometry(2, 10, 50, 400);
    this.textGeometry = new THREE.PlaneGeometry(220, 160);

    this.textMaterial = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: vertexShaderText,
      fragmentShader: fragmentShaderText
    });

    this.stripeMaterial = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: vertexShaderStripe,
      fragmentShader: fragmentShaderStripe,
      side: THREE.DoubleSide
    });

    this.stripeMesh = new THREE.Mesh(this.stripeGeometry, this.stripeMaterial);
    this.textMesh = new THREE.Mesh(this.textGeometry, this.textMaterial);

    this.scrollhandler = this.onScroll.bind(this);
    this.mousemovehandler = this.onMouseMove.bind(this);
    this.touchstarthandler = this.onTouchStart.bind(this);
    this.resizehandler = this.onResize.bind(this);
  }

  onScroll() {
    this.isScrolling = true;
    if (this.scrollTimeout) clearTimeout(this.scrollTimeout);
    this.scrollTimeout = setTimeout(() => {
      this.isScrolling = false;
    }, 200);

    this.newScrollY = window.scrollY;
    // Calculate immediate scroll velocity for uniforms
    const e = this.scrollY - this.newScrollY;
    this.scrollVelocity += 0.2 * (e - this.scrollVelocity);

    this.uniforms.u_scrollY.value = this.newScrollY;
    this.uniforms.u_scrollVelocity.value = this.scrollVelocity;

    this.scrollY = this.newScrollY;
  }

  onMouseMove(e: MouseEvent) {
    if (this.isHero) {
      // Coordinate shift identical to minified script: negative pageX and viewport-relative pageY
      this.mouseX = e.pageX * -1;
      this.mouseY = e.pageY - window.scrollY;
    }
  }

  onTouchStart() {
    this.isTouchScreen = true;
  }

  onResize() {
    const w = document.body.clientWidth;
    this.isSmallScreen = window.innerWidth < 900;

    if (this.isTouchScreen && this.isScrolling) return;

    const h = window.innerHeight;
    this.canvas.width = w;
    this.canvas.height = h;

    const dpr = window.devicePixelRatio || 2;
    this.uniforms.u_resolution.value.x = w * dpr;
    this.uniforms.u_resolution.value.y = h * dpr;

    // Device pixel scale recalculations
    this.uniforms.u_tex0Resolution.value.x = 813 / dpr;
    this.uniforms.u_tex0Resolution.value.y = 201 / dpr;
    this.uniforms.u_devicePixelScale.value = dpr / 2;

    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(dpr);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    // Responsive mesh repositioning matching original
    this.stripeMesh.position.x = this.isSmallScreen ? 1.95 : 2.15;
    this.stripeMesh.rotation.z = this.isSmallScreen ? -0.73 - window.innerWidth / 400 * 0.2 : -0.93;
  }

  initialize() {
    this.scene.add(this.camera);

    // Initial camera settings
    this.camera.position.z = 3;
    this.camera.position.x = 1;
    this.camera.position.y = 1;
    this.camera.rotation.y = 0.5;

    // Compute normals and tangents for normal map projection
    this.stripeGeometry.computeVertexNormals();
    this.stripeGeometry.computeTangents();

    const dpr = window.devicePixelRatio || 2;

    // StripeMesh initial transforms
    this.stripeMesh.rotation.z = this.isSmallScreen ? -0.73 - window.innerWidth / 400 * 0.2 : -0.93;
    this.stripeMesh.rotation.y = this.isHero ? -0.3 : -0.2;
    this.stripeMesh.rotation.x = Math.PI / 1.2;
    this.stripeMesh.position.x = this.isSmallScreen ? 1.95 : 2.15;
    this.stripeMesh.position.y = this.isHero ? -0.8 : -2.2;
    this.stripeMesh.position.z = this.isHero ? 1.5 : 2;

    // TextMesh positioning (flat background plane)
    this.textMesh.position.z = -10;

    this.scene.add(this.stripeMesh);
    // Commented out to remove the middle background logo text
    // if (this.isHero) {
    //   this.scene.add(this.textMesh);
    // }

    this.renderer.setPixelRatio(dpr);
    // Background colors (decimal 16777215 = hex 0xFFFFFF)
    this.renderer.setClearColor(16777215, 1);
    this.scene.background = new THREE.Color(16777215);

    // Append canvas to container
    this.containerElement.appendChild(this.canvas);

    // Register event listeners
    window.addEventListener("touchstart", this.touchstarthandler);
    window.addEventListener("resize", this.resizehandler);
    window.addEventListener("mousemove", this.mousemovehandler);
    window.addEventListener("scroll", this.scrollhandler);

    // Force initial sizing
    this.onResize();

    // Clear and render once immediately to make the canvas white and avoid a black flash while textures load
    this.renderer.render(this.scene, this.camera);

    // Start animation loop
    this.animate(0);
  }

  animate(lastTime = 0) {
    // Scroll velocity easing
    const scrollDelta = this.newScrollY - this.scrollY;
    this.scrollVelocity += 0.2 * (scrollDelta - this.scrollVelocity);

    this.uniforms.u_scrollY.value = this.newScrollY;
    this.uniforms.u_scrollVelocity.value = this.scrollVelocity;

    // Mouse easing
    this.uniforms.u_mouse.value.x += 0.02 * (this.mouseX - this.uniforms.u_mouse.value.x);
    this.uniforms.u_mouse.value.y += 0.02 * (this.mouseY - this.uniforms.u_mouse.value.y);

    this.scrollY = this.newScrollY;

    let now = lastTime;

    // Intro animation: camera and light source transition on load
    if (this.timeScale > 0.501) {
      this.camera.position.x += 0.009 * (0 - this.camera.position.x);
      this.camera.position.y += 0.009 * (0 - this.camera.position.y);
      this.camera.rotation.y += 0.009 * (0 - this.camera.rotation.y);
      this.uniforms.u_light.value.x += 0.009 * (3.2 - this.uniforms.u_light.value.x);
      this.uniforms.u_light.value.y += 0.009 * (1.6 - this.uniforms.u_light.value.y);
      this.uniforms.u_light.value.z += 0.009 * (0.4 - this.uniforms.u_light.value.z);
      this.timeScale += 0.009 * (0.5 - this.timeScale);
    }

    const delta = this.clock.getDelta();
    this.uniforms.u_time.value += delta * this.timeScale * this.fpsRatio;

    if (this.sessionsWaveTexturesLoaded) {
      now = performance.now();
      const frameDuration = now - lastTime;

      // Auto-tuning FPS ratio for low/high end screens
      if (frameDuration >= 8 && frameDuration <= 33) {
        const currentFpsRatio = (1000 / frameDuration) / this.fps;
        this.fpsRatio += (currentFpsRatio - this.fpsRatio) * 0.05;
      }

      // Render call throttling based on FPS/performance
      if (this.fpsRatio > 1.5 || this.skipFrame % 2 === 0 || this.isSmallScreen || this.isTouchScreen) {
        this.renderer.render(this.scene, this.camera);
      }

      // Animated color palette synchronizer
      if (this.skipFrame % 8 === 0 && !this.isScrolling) {
        this.colorFrame += 1;
        const colorOffset = (Math.sin(this.colorFrame * 0.025 - 2.14) * 65 + 45) / 360;
        this.uniforms.u_hueRotation.value = colorOffset * -3;

        const hueStart = 205 + colorOffset * 255;
        const hueEnd = 243 + colorOffset * 255;

        const buttonStart = `hsl(${hueStart}, 97%, 62%)`;
        const buttonEnd = `hsl(${hueEnd}, 100%, 68%)`;
        const buttonStartHover = `hsl(${hueStart}, 87%, 52%)`;
        const buttonEndHover = `hsl(${hueEnd}, 100%, 64%)`;
        const textStart = `hsl(${202 + colorOffset * 255}, 73%, 69%)`;
        const textEnd = `hsl(${235 + colorOffset * 255}, 95%, 67%)`;

        // Push HSL colors to CSS variables so buttons and layout accent elements stay in color-sync
        document.body.style.setProperty("--buttonGradientStart", buttonStart);
        document.body.style.setProperty("--buttonGradientEnd", buttonEnd);
        document.body.style.setProperty("--buttonGradientStartHover", buttonStartHover);
        document.body.style.setProperty("--buttonGradientEndHover", buttonEndHover);
        document.body.style.setProperty("--textGradientStart", textStart);
        document.body.style.setProperty("--textGradientEnd", textEnd);
      }
    }

    this.animationFrameId = requestAnimationFrame(() => {
      this.skipFrame += 1;
      this.animate(now);
    });
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    // Remove event listeners
    window.removeEventListener("touchstart", this.touchstarthandler);
    window.removeEventListener("resize", this.resizehandler);
    window.removeEventListener("mousemove", this.mousemovehandler);
    window.removeEventListener("scroll", this.scrollhandler);

    // Remove canvas from container
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }

    // Clean up Three.js objects
    this.stripeGeometry.dispose();
    this.textGeometry.dispose();
    this.stripeMaterial.dispose();
    this.textMaterial.dispose();
    this.sessionsTexture.dispose();
    this.linesTexture.dispose();
    this.normalsTexture.dispose();
    this.noiseTexture.dispose();
    this.renderer.dispose();

    document.body.classList.remove("Sessions23Wave--isLoaded");
  }
}

export function WaveBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const wave = new SessionsWave(container);
    wave.initialize();

    return () => {
      wave.destroy();
    };
  }, []);

  return <div ref={containerRef} className="Sessions23Wave" />;
}
