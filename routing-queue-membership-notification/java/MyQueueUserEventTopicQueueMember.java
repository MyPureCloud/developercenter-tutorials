import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.annotations.ApiModelProperty;
import java.io.Serializable;
import java.util.Objects;

public class MyQueueUserEventTopicQueueMember implements Serializable {
    private String id = null;
    private String name = null;
    private Integer ringNumber = null;
    private String type = null;
    private Boolean joined = null;

    public MyQueueUserEventTopicQueueMember() {
    }

    public MyQueueUserEventTopicQueueMember memberId(String memberId) {
        this.id = memberId;
        return this;
    }

    @ApiModelProperty(
            example = "null",
            value = ""
    )
    @JsonProperty("id")
    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public MyQueueUserEventTopicQueueMember name(String name) {
        this.name = name;
        return this;
    }

    @ApiModelProperty(
            example = "null",
            value = ""
    )
    @JsonProperty("name")
    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public MyQueueUserEventTopicQueueMember ringNumber(Integer ringNumber) {
        this.ringNumber = ringNumber;
        return this;
    }

    @ApiModelProperty(
            example = "null",
            value = ""
    )
    @JsonProperty("ringNumber")
    public Integer getRingNumber() {
        return this.ringNumber;
    }

    public void setRingNumber(Integer ringNumber) {
        this.ringNumber = ringNumber;
    }

    public MyQueueUserEventTopicQueueMember type(String type) {
        this.type = type;
        return this;
    }

    @ApiModelProperty(
            example = "null",
            value = ""
    )
    @JsonProperty("type")
    public String getType() {
        return this.type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public MyQueueUserEventTopicQueueMember joined(Boolean joined) {
        this.joined = joined;
        return this;
    }

    @ApiModelProperty(
            example = "null",
            value = ""
    )
    @JsonProperty("joined")
    public Boolean getJoined() {
        return this.joined;
    }

    public void setJoined(Boolean joined) {
        this.joined = joined;
    }

    public boolean equals(Object o) {
        if (this == o) {
            return true;
        } else if (o != null && this.getClass() == o.getClass()) {
            MyQueueUserEventTopicQueueMember MyQueueUserEventTopicQueueMember = (MyQueueUserEventTopicQueueMember)o;
            return Objects.equals(this.id, MyQueueUserEventTopicQueueMember.id) && Objects.equals(this.name, MyQueueUserEventTopicQueueMember.name) && Objects.equals(this.ringNumber, MyQueueUserEventTopicQueueMember.ringNumber) && Objects.equals(this.type, MyQueueUserEventTopicQueueMember.type) && Objects.equals(this.joined, MyQueueUserEventTopicQueueMember.joined);
        } else {
            return false;
        }
    }

    public int hashCode() {
        return Objects.hash(new Object[]{this.id, this.name, this.ringNumber, this.type, this.joined});
    }

    public String toString() {
        StringBuilder sb = new StringBuilder();
        sb.append("class MyQueueUserEventTopicQueueMember {\n");
        sb.append("    id: ").append(this.toIndentedString(this.id)).append("\n");
        sb.append("    name: ").append(this.toIndentedString(this.name)).append("\n");
        sb.append("    ringNumber: ").append(this.toIndentedString(this.ringNumber)).append("\n");
        sb.append("    type: ").append(this.toIndentedString(this.type)).append("\n");
        sb.append("    joined: ").append(this.toIndentedString(this.joined)).append("\n");
        sb.append("}");
        return sb.toString();
    }

    private String toIndentedString(Object o) {
        return o == null ? "null" : o.toString().replace("\n", "\n    ");
    }
}
