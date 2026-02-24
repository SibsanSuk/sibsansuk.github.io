# บทที่ 02
## Prefab, Transform และ Physics Scripting ใน Unity
Game Design and Development @ Faculty of Science, Silpakorn University

---
## เป้าหมายของบทนี้
หัวข้อหลัก 3 เรื่องที่ใช้จริงแทบทุกโปรเจกต์:
- `Prefab`: ทำงานซ้ำให้เป็นระบบ และควบคุมมาตรฐานของ object
- `Transform`: ตำแหน่ง, การหมุน, สเกล และความสัมพันธ์แบบ parent-child
- `Rigidbody` + `Collider`: เข้าใจพารามิเตอร์หลัก และควบคุมพฤติกรรมผ่านโค้ด

ผลลัพธ์ที่คาดหวัง:
- ใช้ prefab ได้ถูก workflow (ไม่ duplicate แบบหลุดจากต้นทาง)
- อธิบาย local และ world space ได้ และไม่สับสนเวลาทำของติดมือ, ติดกล้อง, หรือผูกกับวัตถุ
- ตั้งค่า `Rigidbody` แบบมีเหตุผล (ไม่สุ่มตัวเลข)
- เขียน `Physics Scripting` ที่วางเวลาเรียกถูก (`Update` vs `FixedUpdate`)

---
## กติกาตัวอย่างโค้ดของบทนี้ (SOLID)
โค้ดตัวอย่างในบทนี้ออกแบบให้เอาไปต่อยอดงานจริงได้ จึงยึด `SOLID` เป็น baseline:
- `Single Responsibility`: แยก input, movement, collision event ออกจากกัน
- `Open/Closed`: เพิ่มความสามารถด้วย component ใหม่ มากกว่าแก้ของเดิมแบบกระทบหลายที่
- `Dependency Inversion`: ตรงไหนเริ่มซับซ้อน ให้ผูกกันด้วย interface และ contract

---
## ภาพรวมที่เรียนในคาบนี้
1. สถาปัตยกรรมเชิงวัตถุ: `Prefab` และ `Transform`
2. กลศาสตร์ในเอนจิน: `Rigidbody` และ `Collision`
3. การเขียนโปรแกรมเชิงฟิสิกส์ (`Physics Scripting`)
4. กรณีศึกษา: Vacuum Experiment และ GTA5 Train (Kinematic)
5. กิจกรรมปฏิบัติและงานส่ง

---
## Prefab: แม่แบบที่ทีมใช้ร่วมกัน
เวลาเริ่มทำเกมใหม่ หลายคนมักลากของลง scene แล้วปรับทีละชิ้น พอโปรเจกต์เริ่มใหญ่จะเริ่มเจอปัญหา:
- แก้ค่าไม่เหมือนกัน (ทั้งที่ควรเหมือน)
- ทำซ้ำผิดขั้นตอน
- เปลี่ยนทีหนึ่งต้องไล่แก้ทุกที่

`Prefab` คือแม่แบบ (template) ที่รวม component + ค่าเริ่มต้นไว้ในรูป asset เดียว และเป็นตัวช่วยสำคัญในการทำงานแบบ production

ผลที่เห็นชัดในงานจริง:
- ลด human error จากการตั้งค่า object ทีละชิ้น
- แก้ต้นทาง แล้วกระทบ instance แบบเป็นระบบ
- รองรับการทดสอบและ versioning ได้ดีขึ้น

---
## Prefab Workflow (มาตรฐานที่ใช้ในห้อง)
ขั้นตอนพื้นฐาน:
1. สร้าง object ต้นแบบใน scene ให้ครบก่อน (mesh, material, collider, script, ...)
2. แปลงเป็น prefab asset ใน `Project`
3. ใช้ instance จาก prefab แทนการ duplicate object แบบอิสระ
4. ถ้าจำเป็นต้องปรับที่ instance ให้รู้ว่าแก้เฉพาะฉาก หรือแก้ต้นทาง แล้ว `Apply` ให้ถูก

ข้อสังเกตที่เจอบ่อย: ในงาน production ควรแยกค่าทั่วไป, ค่าเฉพาะฉาก, และค่าเฉพาะด่าน ออกจากกันให้ชัด ไม่งั้นตอนดีบั๊กจะไม่รู้ว่าค่ามาจากไหน

---
## Activity: Prefab Workflow Check
[mode:activity]
โจทย์:
1. สร้าง prefab อย่างน้อย 2 ชนิด: (A) environment prop (B) gameplay object
2. ทำ prefab instance 3 ตัวใน scene แล้วปรับค่าเฉพาะฉาก อย่างน้อย 1 ค่า
3. ทดลองแก้ที่ prefab source 1 จุด แล้วตรวจว่ามีผลกับ instance อย่างไร

ส่งในคาบ:
- ภาพหน้าจอ `Hierarchy` + `Inspector` (แสดงว่าปรับอะไรที่ไหน)
- สรุปสั้น ๆ ว่าค่าไหนควรเป็นค่ากลาง, ค่าไหนควรเป็นค่าเฉพาะฉาก, และเพราะอะไร

---
## Transform: องค์ประกอบเชิงเรขาคณิตของวัตถุ
`Transform` เป็น component พื้นฐานที่ทุก `GameObject` ต้องมี และเป็นแกนกลางของการกำหนดสภาวะเชิงพื้นที่

องค์ประกอบหลัก:
- `Position` (ตำแหน่ง)
- `Rotation` (การหมุน)
- `Scale` (การย่อ/ขยาย)

---
## Position, Rotation, Scale: สิ่งที่ต้องอ่านให้เป็น
- `Position`: ตำแหน่งตามแกน `X, Y, Z`
- `Rotation`: ใน Inspector เห็นเป็น Euler แต่ engine ภายในไม่ได้เก็บแบบนั้นทั้งหมด (เลยมีเรื่อง gimbal/ค่ากระโดดให้เจอบ้าง)
- `Scale`: กระทบขนาดที่เห็น และบางเคสกระทบ collider/ความแม่นของการชนด้วย

[Tips] ระวัง `non-uniform scale` (เช่น X=2, Y=1, Z=1, ...) โดยเฉพาะกับ collider หรือ object ที่ต้องคำนวณฟิสิกส์ บางครั้งพฤติกรรมจะคาดเดายากขึ้น

---
## Local Space และ World Space
- `World Space`: อ้างอิงจากระบบพิกัดของฉาก
- `Local Space`: อ้างอิงจาก parent ของวัตถุ

พอทำกล้อง, อาวุธติดมือ, UI ที่ตามวัตถุ หลายคนจะเริ่มสับสนตรงนี้ ถ้าแยก local และ world ให้ขาด งานจะง่ายขึ้นมาก

---
## Parent-Child และการถ่ายทอด Transform
เมื่อ object เป็น child ของอีก object หนึ่ง การเปลี่ยนแปลง transform ของ parent จะส่งผลถึง child ตามลำดับชั้น

ประโยชน์:
- จัดกลุ่มพฤติกรรมที่เคลื่อนร่วมกัน
- ลดความซับซ้อนของการควบคุมหลาย object พร้อมกัน

ข้อจำกัด:
- hierarchy ที่ลึกเกินไปทำให้การดีบั๊กยากขึ้น และบางครั้งทำให้ค่าที่เห็นกับค่าที่คิดคนละเรื่อง (เพราะโดนถ่ายทอดจาก parent)

---
## Activity: Transform Hierarchy
[mode:activity]
โจทย์:
1. สร้าง object 1 ชิ้นเป็น parent และมี child อย่างน้อย 2 ชิ้น
2. ปรับ `Position`, `Rotation`, `Scale` ที่ parent แล้วสังเกตผลที่ child
3. บันทึกค่า `Transform` ทั้ง `local` และ `world` ของ child ก่อน/หลังปรับ

ส่งในคาบ:
- ภาพหน้าจอค่าใน Inspector
- ตารางสรุป: local เปลี่ยนไหม? world เปลี่ยนไหม? เพราะอะไร?

---
## Physics Engine ใน Unity: บทนำ
ระบบฟิสิกส์ใน Unity ทำหน้าที่จำลองแรง การเคลื่อนที่ และการชน โดยแกนหลักที่ต้องรู้มี 2 ตัว:
- `Rigidbody`: body ที่เข้าสู่ simulation
- `Collider`: รูปทรงสำหรับตรวจการชน

หลักสำคัญ: ฟิสิกส์ไม่ใช่แค่เขียนโค้ด แต่คือการวาง component ให้ถูกก่อน แล้วค่อยสั่งแรง, ความเร็ว, หรือ impulse ให้ถูกจังหวะ

---
## Rigidbody Parameter (1): Mass, Drag, Angular Drag
- `Mass`: สัมพันธ์กับการตอบสนองต่อแรงและโมเมนตัมในระบบ
- `Drag`: ต้านการเคลื่อนที่เชิงเส้น
- `Angular Drag`: ต้านการหมุน

[Tips] ค่าเหล่านี้ไม่ได้มีเป้าหมายเพื่อสมจริงที่สุดเสมอไป แต่เพื่อความรู้สึกในการเล่น (game feel) ที่ต้องการ

---
## Rigidbody Parameter (2): Use Gravity, Is Kinematic
- `Use Gravity`: เปิด/ปิดแรงโน้มถ่วง
- `Is Kinematic`: ให้ object ถูกควบคุมโดย code หรือ animation แทนการคำนวณ dynamic เต็มรูปแบบ

ประเด็นที่ต้องจับให้ได้: `Is Kinematic` เป็นเครื่องมือสำคัญเมื่อระบบต้องการ:
- ความเสถียรของระบบ (ไม่อยากให้โดนชนแล้วหลุด)
- พฤติกรรมที่คุมได้ชัด (deterministic)
- ใครเป็นคนสั่ง ระหว่างฟิสิกส์กับโค้ด (control authority)

---
## Rigidbody Parameter (3): Collision Detection, Interpolate, Constraints
- `Collision Detection`:
  - `Discrete`: เร็วและทั่วไป
  - `Continuous`: ลดอาการทะลุเมื่อ object เคลื่อนที่เร็ว
- `Interpolate`: ปรับความลื่นของภาพระหว่าง physics step
- `Constraints`: ล็อกแกนตำแหน่ง/หมุนตามเงื่อนไขเกม

---
## Collision และ Trigger: ความต่างเชิงพฤติกรรม
- `OnCollisionEnter(...)`: สำหรับการชนแบบทึบ มีข้อมูลจุดชนและ normal
- `OnTriggerEnter(...)`: สำหรับพื้นที่เหตุการณ์ที่ไม่ต้องการแรงปะทะโดยตรง

[Tips] แยกการชนเพื่อแรงทางฟิสิกส์ ออกจากการชนเพื่อ logic เกม ให้ชัด ตั้งแต่เริ่มทำ จะลดบั๊กแปลก ๆ ได้เยอะ

---
## Activity: Rigidbody & Collision Experiment
[mode:activity]
[Tips] เปลี่ยนทีละ parameter เท่านั้น เพื่อให้ระบุสาเหตุ-ผลได้ชัดเจน

โจทย์:
1. ทดสอบ `Mass` (1, 5, 20)
2. ทดสอบ `Drag` (0, 1, 5)
3. สลับ `Is Kinematic` เปิด/ปิด
4. เปรียบเทียบ `Collision Detection` แบบ `Discrete` กับ `Continuous`
5. เปรียบเทียบผลเมื่อ apply แรงใน `Update()` กับ `FixedUpdate()`

สิ่งที่ต้องส่ง:
- ภาพ/วิดีโอผลรัน
- ตารางค่า parameter ที่ใช้ + ข้อสังเกต

---
## Physics Scripting: วางเวลาให้ถูกก่อน
กฎที่ใช้จริง:
- คำสั่งที่มีผลต่อฟิสิกส์ควรอยู่ใน `FixedUpdate()`
- `Update()` ใช้กับ input, กล้อง, UI feedback เป็นหลัก
- แยก component ตามหน้าที่ (movement, collision, scoring, ...)
- หลีกเลี่ยงการแก้ `transform.position` โดยตรงใน object ที่เป็น dynamic rigidbody

---
## โครงสร้าง Script ที่แนะนำ
ให้คิดเป็น 3 ชั้น (พอเกมโตแล้วจะดูแลง่าย):
1. `Input Layer`: รับคำสั่งผู้เล่น
2. `Physics Layer`: แปลงคำสั่งเป็นแรง, ความเร็ว แล้วทำใน `FixedUpdate()`
3. `Response Layer`: รับ event การชน, trigger แล้วไปกระตุ้น logic เกม

ประโยชน์: ทดสอบง่าย แก้โค้ดเฉพาะส่วนได้ ลดผลกระทบแบบลูกโซ่

---
## Unity Input System (มาตรฐานของรายวิชา)
รายวิชานี้ใช้ `Unity Input System` เป็นมาตรฐาน ไม่ใช้ Input Manager แบบเดิม

ในบทนี้จะเริ่มจากการอ่าน `Keyboard` โดยตรงก่อน เพื่อโฟกัสที่ physics และเวลาเรียกฟังก์ชัน

แนวคิด `Input Actions`, `Binding`, `Action Map` จะสอนเป็นระบบในบทที่ 03

---
## ตัวอย่างที่ 1: แยก Input กับ Physics ตาม SOLID
<pre style="height: 58vh; overflow:auto;"><code class="language-csharp">using UnityEngine;
using UnityEngine.InputSystem;

public interface IJumpInput
{
    bool ConsumeJump();
}

public class KeyboardJumpInput : MonoBehaviour, IJumpInput
{
    private bool jumpRequested;

    void Update()
    {
        if (Keyboard.current == null) return;
        if (Keyboard.current.spaceKey.wasPressedThisFrame)
            jumpRequested = true;
    }

    public bool ConsumeJump()
    {
        if (!jumpRequested) return false;
        jumpRequested = false;
        return true;
    }
}

[RequireComponent(typeof(Rigidbody))]
public class PhysicsJumpMotor : MonoBehaviour
{
    public float jumpImpulse = 12f;
    public MonoBehaviour jumpInputProvider; // object ที่ implement IJumpInput
    private Rigidbody rb;
    private IJumpInput jumpInput;

    void Awake()
    {
        rb = GetComponent<Rigidbody>();
        jumpInput = jumpInputProvider as IJumpInput;
    }

    void FixedUpdate()
    {
        if (jumpInput == null) return;
        if (!jumpInput.ConsumeJump()) return;
        rb.AddForce(Vector3.up * jumpImpulse, ForceMode.Impulse);
    }
}
</code></pre>

---
## สิ่งที่ต้องเห็นจากตัวอย่างที่ 1
- `KeyboardJumpInput` รับผิดชอบ input เท่านั้น
- `PhysicsJumpMotor` รับผิดชอบแรงทางฟิสิกส์เท่านั้น
- ใช้ interface `IJumpInput` เพื่อลดการผูกกับ implementation เดียว
- สั่งแรงใน `FixedUpdate()` เพื่อให้เข้าจังหวะ physics step

[Tips] เวลาเรียกฟังก์ชันสำคัญพอ ๆ กับสูตรฟิสิกส์ที่ใช้

---
## ตัวอย่างที่ 2: Collision และ Trigger Event
<pre style="height: 58vh; overflow:auto;"><code class="language-csharp">using UnityEngine;

public class CollisionLogOnEnter : MonoBehaviour
{
    void OnCollisionEnter(Collision collision)
    {
        Debug.Log($"Collision with: {collision.gameObject.name}");
    }
}

public class TriggerLogOnEnter : MonoBehaviour
{

    void OnTriggerEnter(Collider other)
    {
        Debug.Log($"Trigger with: {other.gameObject.name}");
    }
}
</code></pre>

---
## สิ่งที่ต้องเห็นจากตัวอย่างที่ 2
- `Collision` ใช้เมื่อสนใจการปะทะทางกายภาพ
- `Trigger` ใช้เมื่อสนใจเหตุการณ์เชิงตรรกะ
- แนะนำให้กรอง tag/layer เพื่อลดการชนที่ไม่เกี่ยวข้อง

[Tips] อย่าเอา business logic ของเกมไปยัดใน event ตรง ๆ ให้ใช้ event เป็นสัญญาณ แล้วส่งต่อไปยังระบบที่รับผิดชอบ

---
## Activity: Physics Scripting Mini Lab
[mode:activity]
โจทย์:
1. ทำ object ที่กระโดดได้ด้วย `AddForce` (ใช้ `Unity Input System` แบบอ่าน `Keyboard` โดยตรง, และ pattern แยก input และ physics แบบตัวอย่าง)
2. ใส่ collider, trigger, และ log event อย่างน้อย 3 สถานการณ์
3. สรุปความต่างของ `Update()` กับ `FixedUpdate()` จากผลที่เห็นจริง (แนบหลักฐาน)

สิ่งที่ต้องส่งในคาบ:
- โค้ด
- ภาพ/วิดีโอผลรัน
- สรุปผลการทดลองเชิงสาเหตุ

---
## กรณีศึกษา 1: Vacuum Experiment (Mass และการตก)
[Tips] ขณะชมคลิป ให้แยกแรงโน้มถ่วง, แรงต้านอากาศ, และสิ่งที่สังเกตได้จริง แล้วอธิบายเป็นระบบ (เหมือนรายงานวิทย์สั้น ๆ)

ลิงก์คลิป (แทนด้วยลิงก์จริงของคุณ):
- https://www.youtube.com/watch?v=YOUR_VACUUM_VIDEO

คำถามอภิปราย:
1. ในสภาวะไม่มีอากาศ ตัวแปรใดที่ยังมีผลต่อการตก?
2. เหตุใดภาพจำในชีวิตประจำวันจึงต่างจากผลทดลองนี้?

---
## กรณีศึกษา 2: GTA5 Train และ Kinematic Behavior
[Tips] วิเคราะห์แบบคนทำระบบเกม: stability, determinism, และ control authority

ลิงก์คลิป (แทนด้วยลิงก์จริงของคุณ):
- https://www.youtube.com/watch?v=YOUR_GTA5_TRAIN_VIDEO

ประเด็นอภิปราย:
- เหตุใด object บางประเภทไม่ควรถูกปล่อยเป็น dynamic ตลอดเวลา
- การใช้ `Is Kinematic` ช่วยรักษาความต่อเนื่องของระบบอย่างไร

---
## เปรียบเทียบ Dynamic กับ Kinematic
- `Dynamic Rigidbody`
  - เหมาะกับ object ที่ต้องตอบสนองแรงชนตามธรรมชาติ
  - มีความแปรผันตามสภาพแวดล้อมสูง
- `Kinematic Rigidbody`
  - เหมาะกับ object ระบบใหญ่ที่ต้องควบคุมทิศทาง/เวลาแม่นยำ
  - ลดความไม่แน่นอนของ simulation

---
## Activity: Kinematic Discussion
[mode:activity]
โจทย์:
1. ยกตัวอย่าง object ในเกม 2 อย่างที่เหมาะเป็น `Dynamic`
2. ยกตัวอย่าง object ในเกม 2 อย่างที่เหมาะเป็น `Kinematic`
3. อธิบายเหตุผลด้วยคำว่า stability, determinism, control authority, ...

ส่งในคาบ:
- ข้อสรุป 6 บรรทัด (dynamic 2 + kinematic 2 + หลักคิดรวม)

---
## สรุปบทที่ 02
- `Prefab` ทำให้การผลิตซ้ำเป็นระบบ และแก้ทีเดียวกระทบหลายจุดได้อย่างปลอดภัย
- `Transform` คือภาษาหลักของการวาง, ผูกวัตถุในฉาก (local vs world ต้องแม่น)
- `Rigidbody` + `Collider` คือแกนของฟิสิกส์ และการตั้งค่าสำคัญพอ ๆ กับการเขียนโค้ด
- `Physics Scripting` ที่ดีคือวางเวลาเรียกให้ถูก (`Update` vs `FixedUpdate`) + แยกหน้าที่โค้ด
- เราจะเชื่อผลทดลองได้ ต้องทดลองแบบคุมตัวแปร (เปลี่ยนทีละอย่าง)

---
## งานที่ต้องส่ง
[mode:activity]
- Scene ที่ใช้ prefab อย่างเป็นระบบ
- ตัวอย่างวัตถุที่แสดงผล parameter ของ `Rigidbody` แตกต่างกันอย่างน้อย 3 ค่า
- Physics scripts อย่างน้อย 2 ตัว (movement, collision, trigger, ...)
- รายงานสรุป 1 หน้า: เปลี่ยนค่าอะไรแล้วส่งผลมากที่สุด, และเรามั่นใจได้อย่างไรว่าเป็นค่านั้นจริง
- แนบลิงก์/ภาพอ้างอิงคลิปที่ใช้ในบทเรียน
